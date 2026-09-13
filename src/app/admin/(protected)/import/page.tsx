import PermissionNeeded from '@/components/admin/PermissionNeeded';
import { hasPermission } from '@/lib/authz';
import { getRecentlyImported } from '@/lib/articles-repository';
import BulkImportClient from './BulkImportClient';

export default async function AdminImportPage() {
  if (!(await hasPermission('import.run'))) {
    return <PermissionNeeded permission="import.run" />;
  }
  const recentImports = await getRecentlyImported(10);
  return <BulkImportClient recentImports={recentImports} />;
}
