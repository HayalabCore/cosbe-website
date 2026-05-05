import {
  listTranslationNamespaces,
  listTranslationRowsForNamespace,
} from '@/actions/translations';
import TranslationsEditor from '@/components/admin/translations/TranslationsEditor';

export default async function AdminTranslationsPage() {
  const namespaces = await listTranslationNamespaces();
  const firstNamespace = namespaces[0] ?? null;
  const initialRows = firstNamespace
    ? await listTranslationRowsForNamespace(firstNamespace)
    : [];

  return (
    <div className="p-6 lg:p-8">
      <div className="mx-auto max-w-[1600px] space-y-8">
        <TranslationsEditor
          initialNamespaces={namespaces}
          initialRows={initialRows}
        />
      </div>
    </div>
  );
}
