'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Lock, Plus } from 'lucide-react';
import AdminDialog from '@/components/admin/access/AdminDialog';
import {
  createRoleAction,
  deleteRoleAction,
  updateRoleAction,
} from '@/actions/roles';
import { canDeleteRole, canEditRole, holdsAll } from '@/lib/authz-rules';
import {
  actorFromDTO,
  type AccessErrorCode,
  type AccessResult,
  type ActorDTO,
  type RoleRow,
} from '@/lib/access-types';
import {
  ALL_PERMISSIONS,
  PERMISSIONS,
  PERMISSION_GROUPS,
  isPermission,
  permissionMessageKey,
  type Permission,
} from '@/lib/permissions';

type Editor = { mode: 'create' } | { mode: 'edit'; role: RoleRow } | null;

const labelClass =
  'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500';
const inputClass =
  'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primaryColor focus:outline-none focus:ring-2 focus:ring-primaryColor/15';

export default function RolesClient({
  roles,
  actor: actorDTO,
}: {
  roles: RoleRow[];
  actor: ActorDTO;
}) {
  const t = useTranslations('admin.roles');
  const tAccess = useTranslations('admin.access');
  const router = useRouter();
  const actor = useMemo(() => actorFromDTO(actorDTO), [actorDTO]);

  const [editor, setEditor] = useState<Editor>(null);
  const [error, setError] = useState<AccessErrorCode | null>(null);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [description, setDescription] = useState('');
  const [permissions, setPermissions] = useState<Permission[]>([]);

  function openEditor(next: Exclude<Editor, null>) {
    setError(null);
    setName(next.mode === 'edit' ? next.role.name : '');
    setKey('');
    setDescription(next.mode === 'edit' ? (next.role.description ?? '') : '');
    setPermissions(
      next.mode === 'edit' ? next.role.permissions.filter(isPermission) : []
    );
    setEditor(next);
  }

  async function run(
    action: () => Promise<AccessResult<unknown>>,
    onOk: () => void
  ) {
    setBusy(true);
    setError(null);
    try {
      const res = await action();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onOk();
      router.refresh();
    } catch {
      setError('FORBIDDEN');
    } finally {
      setBusy(false);
    }
  }

  const label = (p: Permission) =>
    tAccess(`permissions.${permissionMessageKey(p)}.label`);

  const errorBox = error && (
    <p
      role="alert"
      className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
    >
      {tAccess(`errors.${error}`)}
    </p>
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900">
            {t('pageTitle')}
          </h1>
          <p className="mt-1 text-sm text-slate-500">{t('pageSubtitle')}</p>
        </div>
        <button
          type="button"
          onClick={() => openEditor({ mode: 'create' })}
          className="inline-flex items-center gap-2 rounded-lg bg-primaryColor px-3.5 py-2 text-sm font-semibold text-white hover:bg-primaryHover"
        >
          <Plus className="h-4 w-4" />
          {t('newRole')}
        </button>
      </div>

      {editor === null && errorBox}

      <ul className="grid gap-3 md:grid-cols-2">
        {roles.map((role) => {
          const editable = canEditRole(actor, role, role.permissions);
          const deletable = canDeleteRole(actor, role);
          return (
            <li
              key={role.id}
              className="rounded-xl border border-slate-200 bg-white p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-semibold text-slate-900">{role.name}</h2>
                  <p className="font-mono text-xs text-slate-400">{role.key}</p>
                </div>
                {role.isSystem ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                    <Lock className="h-3 w-3" />
                    {t('locked')}
                  </span>
                ) : (
                  <div className="flex gap-1">
                    {editable && (
                      <button
                        type="button"
                        onClick={() => openEditor({ mode: 'edit', role })}
                        className="rounded-md px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                      >
                        {t('edit')}
                      </button>
                    )}
                    {deletable && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          if (
                            !confirm(
                              t('deleteConfirm', {
                                name: role.name,
                                count: role.userCount,
                              })
                            )
                          )
                            return;
                          void run(
                            () => deleteRoleAction({ roleId: role.id }),
                            () => {}
                          );
                        }}
                        className="rounded-md px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        {t('delete')}
                      </button>
                    )}
                  </div>
                )}
              </div>
              {role.description && (
                <p className="mt-2 text-sm text-slate-600">
                  {role.description}
                </p>
              )}
              <p className="mt-3 text-xs text-slate-500">
                <span>
                  {role.isSystem
                    ? t('allPermissions')
                    : t('permissionsCount', {
                        count: role.permissions.filter(isPermission).length,
                      })}
                </span>
                {' · '}
                <span>{t('usersCount', { count: role.userCount })}</span>
              </p>
            </li>
          );
        })}
      </ul>

      {editor && (
        <AdminDialog
          title={
            editor.mode === 'create'
              ? t('editor.createTitle')
              : t('editor.editTitle')
          }
          onClose={() => setEditor(null)}
        >
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void run(
                () =>
                  editor.mode === 'create'
                    ? createRoleAction({ key, name, description, permissions })
                    : updateRoleAction({
                        roleId: editor.role.id,
                        name,
                        description,
                        permissions,
                      }),
                () => setEditor(null)
              );
            }}
          >
            {errorBox}
            <div>
              <label htmlFor="role-name" className={labelClass}>
                {t('editor.name')}
              </label>
              <input
                id="role-name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
              />
            </div>
            {editor.mode === 'create' && (
              <div>
                <label htmlFor="role-key" className={labelClass}>
                  {t('editor.key')}
                </label>
                <input
                  id="role-key"
                  required
                  pattern="[a-z0-9]+(-[a-z0-9]+)*"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  className={`${inputClass} font-mono`}
                />
                <p className="mt-1 text-xs text-slate-400">
                  {t('editor.keyHint')}
                </p>
              </div>
            )}
            <div>
              <label htmlFor="role-description" className={labelClass}>
                {t('editor.description')}
              </label>
              <input
                id="role-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={inputClass}
              />
            </div>
            <fieldset>
              <legend className={labelClass}>{t('editor.permissions')}</legend>
              <div className="space-y-4">
                {PERMISSION_GROUPS.map((group) => (
                  <div key={group}>
                    <p className="mb-1.5 text-sm font-semibold text-slate-800">
                      {tAccess(`groups.${group}`)}
                    </p>
                    <div className="space-y-1.5">
                      {ALL_PERMISSIONS.filter(
                        (p) => PERMISSIONS[p].group === group
                      ).map((p) => {
                        const held = holdsAll(actor, [p]);
                        const checked = permissions.includes(p);
                        return (
                          <label
                            key={p}
                            title={held ? undefined : t('editor.notHeld')}
                            className={`flex items-start gap-2.5 rounded-lg px-2 py-1.5 text-sm ${
                              held
                                ? 'cursor-pointer hover:bg-slate-50'
                                : 'cursor-not-allowed text-slate-400'
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="mt-0.5"
                              checked={checked}
                              disabled={!held}
                              onChange={() =>
                                setPermissions(
                                  checked
                                    ? permissions.filter((x) => x !== p)
                                    : [...permissions, p]
                                )
                              }
                            />
                            <span>
                              <span className="block font-medium">
                                {label(p)}
                              </span>
                              <span className="block text-xs text-slate-500">
                                {tAccess(
                                  `permissions.${permissionMessageKey(p)}.description`
                                )}
                              </span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </fieldset>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditor(null)}
                className="rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                {t('editor.cancel')}
              </button>
              <button
                type="submit"
                disabled={busy}
                className="rounded-lg bg-primaryColor px-3.5 py-2 text-sm font-semibold text-white hover:bg-primaryHover disabled:opacity-50"
              >
                {busy ? t('editor.saving') : t('editor.save')}
              </button>
            </div>
          </form>
        </AdminDialog>
      )}
    </div>
  );
}
