'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { LayoutTemplate, Pencil, Plus, Trash2 } from 'lucide-react';
import AdminDialog from '@/components/admin/access/AdminDialog';
import {
  createTemplateAction,
  deleteTemplateAction,
  listTemplatesAction,
  updateTemplateAction,
  type TemplateDTO,
} from '@/actions/studio-templates';
import { usePermissions } from '@/components/admin/PermissionsContext';
import { ARTICLE_CREATE_CATEGORIES } from '@/lib/api/article-create-metadata';
import type { StudioResult } from '@/lib/studio/action-types';
import ConfirmDialog from './ConfirmDialog';
import { errorText } from './pieces/errorText';
import {
  Badge,
  Button,
  EmptyState,
  Field,
  Select,
  TextArea,
  TextInput,
} from './ui';

type Draft = Omit<TemplateDTO, 'id' | 'isDefault'> & {
  id?: string;
  isDefault: boolean;
};
const EMPTY: Draft = {
  name: '',
  description: '',
  instructions: '',
  defaultCategory: 'useful-info',
  isDefault: false,
};

function TemplateForm({
  template,
  onDone,
}: {
  template: Draft;
  onDone: () => void;
}) {
  const t = useTranslations('admin.studio');
  const [draft, setDraft] = useState(template);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const input = {
    name: draft.name,
    description: draft.description,
    instructions: draft.instructions,
    defaultCategory: draft.defaultCategory,
  };
  async function save() {
    setBusy(true);
    setMessage(null);
    try {
      const result: StudioResult<unknown> = draft.id
        ? await updateTemplateAction(draft.id, input)
        : await createTemplateAction(input);
      if (result.ok) return onDone();
      setMessage(errorText(t, result));
    } catch {
      setMessage(errorText(t, { error: 'FAILED' }));
    }
    setBusy(false);
  }
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <Field label={t('templates.name')} required>
        {(p) => (
          <TextInput
            {...p}
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
        )}
      </Field>
      <Field
        label={t('templates.description')}
        hint={t('templates.descriptionHint')}
      >
        {(p) => (
          <TextInput
            {...p}
            value={draft.description}
            onChange={(e) =>
              setDraft({ ...draft, description: e.target.value })
            }
          />
        )}
      </Field>
      <Field
        label={t('templates.instructions')}
        hint={t('templates.instructionsHint')}
      >
        {(p) => (
          <TextArea
            {...p}
            rows={8}
            value={draft.instructions}
            onChange={(e) =>
              setDraft({ ...draft, instructions: e.target.value })
            }
          />
        )}
      </Field>
      <Field label={t('templates.defaultCategory')}>
        {(p) => (
          <Select
            {...p}
            value={draft.defaultCategory}
            onChange={(e) =>
              setDraft({
                ...draft,
                defaultCategory: e.target.value as Draft['defaultCategory'],
              })
            }
          >
            {ARTICLE_CREATE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {t(`category.${c}`)}
              </option>
            ))}
          </Select>
        )}
      </Field>
      {message && (
        <p role="alert" className="text-sm text-red-600">
          {message}
        </p>
      )}
      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        <Button variant="ghost" onClick={onDone}>
          {t('confirm.cancel')}
        </Button>
        <Button type="submit" variant="primary" busy={busy}>
          {t('templates.save')}
        </Button>
      </div>
    </form>
  );
}

export default function TemplateManager() {
  const t = useTranslations('admin.studio');
  const { can } = usePermissions();
  const canManage = can('studio.templates.manage');
  const [templates, setTemplates] = useState<Draft[] | null>(null);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [deleting, setDeleting] = useState<Draft | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const result = await listTemplatesAction();
    setTemplates(result.ok ? result.data : []);
  }, []);
  useEffect(() => {
    void listTemplatesAction().then((result) =>
      setTemplates(result.ok ? result.data : [])
    );
  }, []);

  async function remove(template: Draft) {
    setDeleting(null);
    setMessage(null);
    try {
      const result = await deleteTemplateAction(template.id!);
      if (!result.ok) return setMessage(errorText(t, result));
    } catch {
      return setMessage(errorText(t, { error: 'FAILED' }));
    }
    void load();
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <span />
        {canManage && (
          <Button
            variant="primary"
            icon={<Plus className="h-4 w-4" aria-hidden />}
            onClick={() => setEditing(EMPTY)}
          >
            {t('templates.new')}
          </Button>
        )}
      </div>
      {message && (
        <p role="alert" className="text-sm text-red-600">
          {message}
        </p>
      )}
      {templates?.length === 0 && (
        <EmptyState
          icon={<LayoutTemplate className="h-5 w-5" aria-hidden />}
          title={t('templates.empty')}
        />
      )}
      <ul className="grid gap-3 md:grid-cols-2">
        {templates?.map((template) => (
          <li
            key={template.id}
            className="flex flex-col rounded-xl border border-slate-200 bg-white p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-2 font-semibold text-slate-900">
                  {template.name}
                  {template.isDefault && (
                    <Badge tone="blue">{t('templates.default')}</Badge>
                  )}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {template.description ? `${template.description} · ` : ''}
                  {t(`category.${template.defaultCategory}`)}
                </p>
              </div>
              {canManage && (
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    aria-label={t('templates.editNamed', {
                      name: template.name,
                    })}
                    onClick={() => setEditing(template)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  >
                    <Pencil className="h-4 w-4" aria-hidden />
                  </button>
                  {!template.isDefault && (
                    <button
                      type="button"
                      aria-label={t('templates.delete')}
                      onClick={() => setDeleting(template)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  )}
                </div>
              )}
            </div>
            <p className="mt-3 line-clamp-4 whitespace-pre-line rounded-lg bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-600">
              {template.instructions}
            </p>
          </li>
        ))}
      </ul>
      {editing && (
        <AdminDialog
          title={editing.id ? t('templates.edit') : t('templates.new')}
          onClose={() => setEditing(null)}
        >
          <TemplateForm
            template={editing}
            onDone={() => {
              setEditing(null);
              void load();
            }}
          />
        </AdminDialog>
      )}
      {deleting && (
        <ConfirmDialog
          title={t('templates.deleteTitle')}
          confirmLabel={t('templates.delete')}
          danger
          onClose={() => setDeleting(null)}
          onConfirm={() => void remove(deleting)}
        >
          <p>{t('templates.confirmDelete', { name: deleting.name })}</p>
        </ConfirmDialog>
      )}
    </section>
  );
}
