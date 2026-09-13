import { redirect } from 'next/navigation';
import PermissionNeeded from '@/components/admin/PermissionNeeded';
import PostEditor from '@/components/admin/PostEditor';
import { hasPermission } from '@/lib/authz';
import { getArticleByIdAdmin } from '@/lib/articles';

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await hasPermission('articles.edit'))) {
    return <PermissionNeeded permission="articles.edit" />;
  }
  const { id } = await params;
  const article = await getArticleByIdAdmin(id);
  if (!article) {
    redirect('/admin/dashboard');
  }
  return <PostEditor initialArticle={article} />;
}
