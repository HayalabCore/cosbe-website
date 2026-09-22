import PermissionNeeded from '@/components/admin/PermissionNeeded';
import StudioHome from '@/components/admin/studio/StudioHome';
import { hasPermission } from '@/lib/authz';

export default async function AdminStudioPage() {
  if (!(await hasPermission('studio.use'))) {
    return <PermissionNeeded permission="studio.use" />;
  }
  return <StudioHome />;
}
