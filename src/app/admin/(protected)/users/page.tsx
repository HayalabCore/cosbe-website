import PermissionNeeded from '@/components/admin/PermissionNeeded';
import { listRolesAction } from '@/actions/roles';
import { listUsersAction } from '@/actions/users';
import { actorToDTO } from '@/lib/access-types';
import { getCurrentAdmin } from '@/lib/authz';
import UsersClient from './UsersClient';

export default async function UsersPage() {
  const current = await getCurrentAdmin();
  if (
    current.status !== 'active' ||
    !current.actor.permissions.has('users.view')
  ) {
    return <PermissionNeeded permission="users.view" />;
  }
  const [users, roles] = await Promise.all([
    listUsersAction(),
    listRolesAction(),
  ]);
  return (
    <UsersClient
      users={users}
      roles={roles}
      actor={actorToDTO(current.actor)}
    />
  );
}
