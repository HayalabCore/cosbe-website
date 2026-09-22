import PermissionNeeded from '@/components/admin/PermissionNeeded';
import ProjectList from '@/components/admin/studio/ProjectList';
import StudioHome from '@/components/admin/studio/StudioHome';
import { hasPermission } from '@/lib/authz';

export default async function StudioProjectsPage() {
  if (!(await hasPermission('studio.use'))) {
    return <PermissionNeeded permission="studio.use" />;
  }
  return (
    <StudioHome>
      <ProjectList />
    </StudioHome>
  );
}
