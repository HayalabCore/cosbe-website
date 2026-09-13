import PermissionNeeded from '@/components/admin/PermissionNeeded';
import { hasPermission } from '@/lib/authz';
import MediaClient from './MediaClient';

export default async function AdminMediaPage() {
  if (!(await hasPermission('media.upload'))) {
    return <PermissionNeeded permission="media.upload" />;
  }
  return <MediaClient />;
}
