import { redirect } from 'next/navigation';
import PostEditor from '@/components/admin/PostEditor';
import { getArticleByIdAdmin } from '@/lib/articles';

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const article = await getArticleByIdAdmin(id);
  if (!article) {
    redirect('/admin/dashboard');
  }
  return <PostEditor initialArticle={article} />;
}
