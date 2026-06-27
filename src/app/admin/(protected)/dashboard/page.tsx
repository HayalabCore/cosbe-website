import { getArticles } from '@/lib/articles-repository';
import DashboardClient from './DashboardClient';

// All admin posts are loaded once and the table (sort/filter/paginate/select)
// runs entirely client-side. Fine for a marketing CMS (hundreds of posts).
export default async function AdminDashboardPage() {
  const items = await getArticles({}, true);
  return <DashboardClient items={items} />;
}
