import PermissionNeeded from '@/components/admin/PermissionNeeded';
import { listRolesAction } from '@/actions/roles';
import { actorToDTO } from '@/lib/access-types';
import { getCurrentAdmin } from '@/lib/authz';
import RolesClient from './RolesClient';

export default async function RolesPage() {
  const current = await getCurrentAdmin();
  if (
    current.status !== 'active' ||
    !current.actor.permissions.has('roles.manage')
  ) {
    return <PermissionNeeded permission="roles.manage" />;
  }
  const roles = await listRolesAction();
  return <RolesClient roles={roles} actor={actorToDTO(current.actor)} />;
}
