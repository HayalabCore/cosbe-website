'use client';

import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { UserPlus } from 'lucide-react';
import AdminBusyButton from '@/components/admin/AdminBusyButton';
import AdminDialog from '@/components/admin/access/AdminDialog';
import RoleCheckboxes from '@/components/admin/access/RoleCheckboxes';
import TempPasswordField from '@/components/admin/access/TempPasswordField';
import {
  createUserAction,
  deleteUserAction,
  disableUserAction,
  enableUserAction,
  resetPasswordAction,
  setUserRolesAction,
} from '@/actions/users';
import { useAccessAction, useSyncedList } from '@/hooks';
import { createdUserRow, userWithRoles } from '@/lib/access-optimistic';
import { canModifyUser } from '@/lib/authz-rules';
import {
  actorFromDTO,
  type ActorDTO,
  type AdminUserRow,
  type RoleRow,
} from '@/lib/access-types';
import { generateTempPassword } from '@/lib/temp-password';
import { PASSWORD_MIN_LENGTH } from '@/lib/validation/access';

type Dialog =
  | { kind: 'add' }
  | { kind: 'roles'; user: AdminUserRow }
  | { kind: 'reset'; user: AdminUserRow }
  | { kind: 'delete'; user: AdminUserRow }
  | { kind: 'credentials'; email: string; password: string }
  | null;

const labelClass =
  'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500';
const inputClass =
  'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primaryColor focus:outline-none focus:ring-2 focus:ring-primaryColor/15';
const primaryButton =
  'rounded-lg bg-primaryColor px-3.5 py-2 text-sm font-semibold text-white hover:bg-primaryHover disabled:opacity-50';
const secondaryButton =
  'rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50';
const rowButton =
  'rounded-md px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50';

export default function UsersClient({
  users,
  roles,
  actor: actorDTO,
}: {
  users: AdminUserRow[];
  roles: RoleRow[];
  actor: ActorDTO;
}) {
  const t = useTranslations('admin.users');
  const tErrors = useTranslations('admin.access.errors');
  const locale = useLocale();
  const actor = useMemo(() => actorFromDTO(actorDTO), [actorDTO]);
  const can = (p: Parameters<typeof actor.permissions.has>[0]) =>
    actor.permissions.has(p);
  const roleNames = useMemo(
    () => new Map(roles.map((r) => [r.id, r.name])),
    [roles]
  );

  const [dialog, setDialog] = useState<Dialog>(null);
  const { isBusy, error, setError, run } = useAccessAction();
  const { items: rows, patch, remove, prepend } = useSyncedList(users);

  // Form state for dialogs (reset whenever a dialog opens).
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const [confirmText, setConfirmText] = useState('');

  function open(next: Exclude<Dialog, null>) {
    setError(null);
    setEmail('');
    setDisplayName('');
    setPassword(generateTempPassword());
    setRoleIds(next.kind === 'roles' ? next.user.roleIds : []);
    setConfirmText('');
    setDialog(next);
  }

  const formatDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString(locale) : t('never');

  const errorBox = error && (
    <p
      role="alert"
      className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
    >
      {tErrors(error)}
    </p>
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900">
            {t('pageTitle')}
          </h1>
          <p className="mt-1 text-sm text-slate-500">{t('pageSubtitle')}</p>
        </div>
        {can('users.create') && (
          <button
            type="button"
            onClick={() => open({ kind: 'add' })}
            className={`${primaryButton} inline-flex items-center gap-2`}
          >
            <UserPlus className="h-4 w-4" />
            {t('addUser')}
          </button>
        )}
      </div>

      {dialog === null && errorBox}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-semibold">{t('columns.user')}</th>
              <th className="px-4 py-3 font-semibold">{t('columns.roles')}</th>
              <th className="px-4 py-3 font-semibold">{t('columns.status')}</th>
              <th className="px-4 py-3 font-semibold">
                {t('columns.lastSignIn')}
              </th>
              <th className="px-4 py-3 font-semibold">
                {t('columns.created')}
              </th>
              <th className="px-4 py-3 text-right font-semibold">
                {t('columns.actions')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((u) => {
              const isMe = u.id === actor.userId;
              const modifiable = canModifyUser(actor, {
                id: u.id,
                isSuperAdmin: u.isSuperAdmin,
                permissions: u.permissions,
              });
              return (
                <tr key={u.id} className="align-top">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900">
                        {u.email}
                      </span>
                      {isMe && (
                        <span className="rounded-full bg-primaryColor/10 px-2 py-0.5 text-[10px] font-semibold text-primaryColor">
                          {t('you')}
                        </span>
                      )}
                    </div>
                    {u.displayName && (
                      <div className="text-xs text-slate-500">
                        {u.displayName}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {u.roleIds.length === 0 ? (
                      <span className="text-xs text-slate-400">
                        {t('noRoles')}
                      </span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {u.roleIds.map((id) => (
                          <span
                            key={id}
                            className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700"
                          >
                            {roleNames.get(id) ?? id}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        u.disabled
                          ? 'bg-red-50 text-red-700'
                          : u.mustChangePassword
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      {u.disabled
                        ? t('status.disabled')
                        : u.mustChangePassword
                          ? t('status.mustChangePassword')
                          : t('status.active')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {formatDate(u.lastSignInAt)}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {formatDate(u.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    {modifiable && (
                      <div className="flex flex-wrap justify-end gap-1">
                        {can('users.assign-roles') && (
                          <button
                            type="button"
                            className={rowButton}
                            onClick={() => open({ kind: 'roles', user: u })}
                          >
                            {t('actions.editRoles')}
                          </button>
                        )}
                        {can('users.create') && (
                          <button
                            type="button"
                            className={rowButton}
                            onClick={() => open({ kind: 'reset', user: u })}
                          >
                            {t('actions.resetPassword')}
                          </button>
                        )}
                        {can('users.disable') &&
                          (u.disabled ? (
                            <AdminBusyButton
                              compact
                              busy={isBusy(u.id)}
                              idleLabel={t('actions.enable')}
                              busyLabel={t('dialog.saving')}
                              className={rowButton}
                              onClick={() =>
                                void run(
                                  () => enableUserAction({ userId: u.id }),
                                  () => patch(u.id, { disabled: false }),
                                  u.id
                                )
                              }
                            />
                          ) : (
                            <AdminBusyButton
                              compact
                              busy={isBusy(u.id)}
                              idleLabel={t('actions.disable')}
                              busyLabel={t('dialog.saving')}
                              className={`${rowButton} text-amber-700`}
                              onClick={() => {
                                if (
                                  !confirm(
                                    t('dialog.disableConfirm', {
                                      email: u.email,
                                    })
                                  )
                                )
                                  return;
                                void run(
                                  () => disableUserAction({ userId: u.id }),
                                  () => patch(u.id, { disabled: true }),
                                  u.id
                                );
                              }}
                            />
                          ))}
                        {can('users.delete') && u.disabled && (
                          <button
                            type="button"
                            className={`${rowButton} text-red-600`}
                            onClick={() => open({ kind: 'delete', user: u })}
                          >
                            {t('actions.delete')}
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {dialog?.kind === 'add' && (
        <AdminDialog
          title={t('dialog.addTitle')}
          onClose={() => setDialog(null)}
        >
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              const submitted = password;
              if (submitted.length < PASSWORD_MIN_LENGTH) {
                setError('WEAK_PASSWORD');
                return;
              }
              void run(
                () =>
                  createUserAction({
                    email,
                    displayName,
                    password: submitted,
                    roleIds,
                  }),
                (data) => {
                  prepend(
                    createdUserRow({
                      id: data.id,
                      email: data.email,
                      displayName,
                      roleIds,
                      roles,
                    })
                  );
                  setDialog({
                    kind: 'credentials',
                    email: data.email,
                    password: submitted,
                  });
                },
                'dialog'
              );
            }}
          >
            {errorBox}
            <div>
              <label htmlFor="new-user-email" className={labelClass}>
                {t('dialog.email')}
              </label>
              <input
                id="new-user-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="new-user-name" className={labelClass}>
                {t('dialog.displayName')}
              </label>
              <input
                id="new-user-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className={inputClass}
              />
            </div>
            <TempPasswordField value={password} onChange={setPassword} />
            <RoleCheckboxes
              roles={roles}
              selected={roleIds}
              onChange={setRoleIds}
              actor={actor}
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                className={secondaryButton}
                onClick={() => setDialog(null)}
              >
                {t('dialog.cancel')}
              </button>
              <AdminBusyButton
                type="submit"
                busy={isBusy('dialog')}
                idleLabel={t('dialog.create')}
                busyLabel={t('dialog.saving')}
                className={primaryButton}
              />
            </div>
          </form>
        </AdminDialog>
      )}

      {dialog?.kind === 'roles' && (
        <AdminDialog
          title={t('dialog.editRolesTitle', { email: dialog.user.email })}
          onClose={() => setDialog(null)}
        >
          {errorBox}
          <RoleCheckboxes
            roles={roles}
            selected={roleIds}
            onChange={setRoleIds}
            actor={actor}
          />
          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              className={secondaryButton}
              onClick={() => setDialog(null)}
            >
              {t('dialog.cancel')}
            </button>
            <AdminBusyButton
              type="button"
              busy={isBusy('dialog')}
              idleLabel={t('dialog.save')}
              busyLabel={t('dialog.saving')}
              className={primaryButton}
              onClick={() => {
                const targetId = dialog.user.id;
                const nextRoleIds = roleIds;
                void run(
                  () =>
                    setUserRolesAction({
                      userId: targetId,
                      roleIds: nextRoleIds,
                    }),
                  () => {
                    patch(targetId, (row) =>
                      userWithRoles(row, nextRoleIds, roles)
                    );
                    setDialog(null);
                  },
                  'dialog'
                );
              }}
            />
          </div>
        </AdminDialog>
      )}

      {dialog?.kind === 'reset' && (
        <AdminDialog
          title={t('dialog.resetTitle', { email: dialog.user.email })}
          onClose={() => setDialog(null)}
        >
          {errorBox}
          <TempPasswordField value={password} onChange={setPassword} />
          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              className={secondaryButton}
              onClick={() => setDialog(null)}
            >
              {t('dialog.cancel')}
            </button>
            <AdminBusyButton
              type="button"
              busy={isBusy('dialog')}
              idleLabel={t('dialog.reset')}
              busyLabel={t('dialog.saving')}
              className={primaryButton}
              onClick={() => {
                const submitted = password;
                if (submitted.length < PASSWORD_MIN_LENGTH) {
                  setError('WEAK_PASSWORD');
                  return;
                }
                const target = dialog.user;
                void run(
                  () =>
                    resetPasswordAction({
                      userId: target.id,
                      password: submitted,
                    }),
                  () => {
                    patch(target.id, { mustChangePassword: true });
                    setDialog({
                      kind: 'credentials',
                      email: target.email,
                      password: submitted,
                    });
                  },
                  'dialog'
                );
              }}
            />
          </div>
        </AdminDialog>
      )}

      {dialog?.kind === 'delete' && (
        <AdminDialog
          title={t('dialog.deleteTitle', { email: dialog.user.email })}
          onClose={() => setDialog(null)}
        >
          {errorBox}
          <p className="mb-3 text-sm text-slate-600">
            {t('dialog.deleteHint')}
          </p>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={dialog.user.email}
            className={inputClass}
          />
          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              className={secondaryButton}
              onClick={() => setDialog(null)}
            >
              {t('dialog.cancel')}
            </button>
            <AdminBusyButton
              type="button"
              busy={isBusy('dialog')}
              idleLabel={t('dialog.deleteCta')}
              busyLabel={t('dialog.saving')}
              className="rounded-lg bg-red-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              disabled={confirmText.trim() !== dialog.user.email}
              onClick={() => {
                const targetId = dialog.user.id;
                void run(
                  () => deleteUserAction({ userId: targetId }),
                  () => {
                    remove(targetId);
                    setDialog(null);
                  },
                  'dialog'
                );
              }}
            />
          </div>
        </AdminDialog>
      )}

      {dialog?.kind === 'credentials' && (
        <AdminDialog
          title={t('dialog.credentialsTitle')}
          onClose={() => setDialog(null)}
        >
          <p className="mb-4 text-sm text-slate-600">
            {t('dialog.credentialsHint')}
          </p>
          <dl className="space-y-2 rounded-lg bg-slate-50 p-3 font-mono text-sm">
            <div>
              <dt className="text-xs text-slate-500">{t('dialog.email')}</dt>
              <dd>{dialog.email}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">
                {t('dialog.tempPassword')}
              </dt>
              <dd>{dialog.password}</dd>
            </div>
          </dl>
          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              className={secondaryButton}
              onClick={() =>
                void navigator.clipboard?.writeText(
                  `${dialog.email}\n${dialog.password}`
                )
              }
            >
              {t('dialog.copy')}
            </button>
            <button
              type="button"
              className={primaryButton}
              onClick={() => setDialog(null)}
            >
              {t('dialog.done')}
            </button>
          </div>
        </AdminDialog>
      )}
    </div>
  );
}
