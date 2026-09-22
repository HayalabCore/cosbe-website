import PermissionNeeded from '@/components/admin/PermissionNeeded';
import StudioHome from '@/components/admin/studio/StudioHome';
import PieceWorkspace from '@/components/admin/studio/pieces/PieceWorkspace';
import { hasPermission } from '@/lib/authz';

export default async function StudioPiecePage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await hasPermission('studio.use'))) return <PermissionNeeded permission="studio.use" />;
  const { id } = await params;
  return <StudioHome><PieceWorkspace pieceId={id} /></StudioHome>;
}
