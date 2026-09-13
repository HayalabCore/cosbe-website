import type { Permission } from '@/lib/permissions';
import type { ArticleStatus } from '@/types';

/**
 * Extra permissions (beyond `articles.edit`) needed when a create/update
 * changes an article's status. A new article counts as coming from `draft`.
 */
export function statusChangePermissions(
  from: ArticleStatus,
  to: ArticleStatus
): Permission[] {
  if (from === to) return [];
  const needed: Permission[] = [];
  if (from === 'published' || to === 'published') {
    needed.push('articles.publish');
  }
  if (from === 'archived' || to === 'archived') {
    needed.push('articles.archive');
  }
  return needed;
}
