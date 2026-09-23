import PermissionNeeded from '@/components/admin/PermissionNeeded';
import TopicDetail from '@/components/admin/studio/TopicDetail';
import StudioHome from '@/components/admin/studio/StudioHome';
import { hasPermission } from '@/lib/authz';

export default async function StudioTopicPage({
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
      <TopicDetail topicId={id} />
    </StudioHome>
  );
}
