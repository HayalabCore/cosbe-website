import PermissionNeeded from '@/components/admin/PermissionNeeded';
import TopicList from '@/components/admin/studio/TopicList';
import StudioHome from '@/components/admin/studio/StudioHome';
import { hasPermission } from '@/lib/authz';

export default async function StudioTopicsPage() {
  if (!(await hasPermission('studio.use'))) {
    return <PermissionNeeded permission="studio.use" />;
  }
  return (
    <StudioHome>
      <TopicList />
    </StudioHome>
  );
}
