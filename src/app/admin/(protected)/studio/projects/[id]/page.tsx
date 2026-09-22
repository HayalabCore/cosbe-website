import PermissionNeeded from '@/components/admin/PermissionNeeded';
import ProjectDetail from '@/components/admin/studio/ProjectDetail';
import StudioHome from '@/components/admin/studio/StudioHome';
import { hasPermission } from '@/lib/authz';

export default async function StudioProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await hasPermission('studio.use'))) {
    return <PermissionNeeded permission="studio.use" />;
  }
  const { id } = await params;
  return (
    <StudioHome>
      <ProjectDetail projectId={id} />
    </StudioHome>
  );
}
