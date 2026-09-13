'use client';

import { useTranslations } from 'next-intl';
import { canAssignRole, type Actor } from '@/lib/authz-rules';
import type { RoleRow } from '@/lib/access-types';

export default function RoleCheckboxes({
  roles,
  selected,
  onChange,
  actor,
}: {
  roles: RoleRow[];
  selected: string[];
  onChange: (ids: string[]) => void;
  actor: Actor;
}) {
  const t = useTranslations('admin.users.dialog');
  return (
    <fieldset className="space-y-2">
      <legend className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {t('roles')}
      </legend>
      {roles.map((role) => {
        // Adding and removing both need canAssignRole (no escalation).
        const assignable = canAssignRole(actor, role);
        const checked = selected.includes(role.id);
        return (
          <label
            key={role.id}
            title={assignable ? undefined : t('roleNotAssignable')}
            className={`flex items-start gap-2.5 rounded-lg border px-3 py-2 text-sm ${
              assignable
                ? 'cursor-pointer border-slate-200 hover:bg-slate-50'
                : 'cursor-not-allowed border-slate-100 bg-slate-50 text-slate-400'
            }`}
          >
            <input
              type="checkbox"
              className="mt-0.5"
              checked={checked}
              disabled={!assignable}
              onChange={() =>
                onChange(
                  checked
                    ? selected.filter((id) => id !== role.id)
                    : [...selected, role.id]
                )
              }
            />
            <span>
              <span className="block font-medium">{role.name}</span>
              {role.description && (
                <span className="block text-xs text-slate-500">
                  {role.description}
                </span>
              )}
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}
