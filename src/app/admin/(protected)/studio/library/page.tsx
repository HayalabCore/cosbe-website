import PermissionNeeded from '@/components/admin/PermissionNeeded';
import SourceLibrary from '@/components/admin/studio/SourceLibrary';
import StudioHome from '@/components/admin/studio/StudioHome';
import { hasPermission } from '@/lib/authz';

export default async function StudioLibraryPage() {
  if (!(await hasPermission('studio.use'))) {
    return <PermissionNeeded permission="studio.use" />;
  }
  return (
    <StudioHome>
      <SourceLibrary />
    </StudioHome>
  );
}
