import { getRecentlyImported } from '@/lib/articles-repository';
import BulkImportClient from './BulkImportClient';

export default async function AdminImportPage() {
  const recentImports = await getRecentlyImported(10);
  return <BulkImportClient recentImports={recentImports} />;
}
