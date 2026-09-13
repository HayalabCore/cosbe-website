import PermissionNeeded from '@/components/admin/PermissionNeeded';
import PostEditor from '@/components/admin/PostEditor';
import { hasPermission } from '@/lib/authz';

export default async function NewPostPage() {
  if (!(await hasPermission('articles.edit'))) {
    return <PermissionNeeded permission="articles.edit" />;
  }
  return <PostEditor />;
}
