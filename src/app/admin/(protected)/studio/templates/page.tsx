import PermissionNeeded from '@/components/admin/PermissionNeeded';
import StudioHome from '@/components/admin/studio/StudioHome';
import TemplateManager from '@/components/admin/studio/TemplateManager';
import { hasPermission } from '@/lib/authz';

export default async function StudioTemplatesPage() {
  if (!(await hasPermission('studio.use'))) return <PermissionNeeded permission="studio.use" />;
  return <StudioHome><TemplateManager /></StudioHome>;
}
