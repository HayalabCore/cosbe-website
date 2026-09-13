'use client';

import { ShieldAlert } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { permissionMessageKey, type Permission } from '@/lib/permissions';

export default function PermissionNeeded({
  permission,
}: {
  permission: Permission;
}) {
  const t = useTranslations('admin.access');
  const label = t(`permissions.${permissionMessageKey(permission)}.label`);
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6 py-16">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
          <ShieldAlert className="h-6 w-6" strokeWidth={1.75} />
        </div>
        <h1 className="text-xl font-bold text-slate-900">
          {t('permissionNeeded.title')}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          {t('permissionNeeded.body', { permission: label })}
        </p>
      </div>
    </div>
  );
}
