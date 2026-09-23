'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
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
import { errorText } from './pieces/errorText';

type Draft = Omit<TemplateDTO, 'id' | 'isDefault'> & { id?: string; isDefault: boolean };
const EMPTY: Draft = { name: '', description: '', instructions: '', defaultCategory: 'useful-info', isDefault: false };

function Card({ template, canManage, onChanged }: { template: Draft; canManage: boolean; onChanged: () => void }) {
  const t = useTranslations('admin.studio');
  const [draft, setDraft] = useState(template);
  const [message, setMessage] = useState<string | null>(null);
  async function act(action: () => Promise<StudioResult<unknown>>) {
    setMessage(null);
    try {
      const result = await action();
      if (!result.ok) {
        setMessage(errorText(t, result));
        return;
      }
    } catch {
      setMessage(errorText(t, { error: 'FAILED' }));
      return;
    }
    onChanged();
  }
  const field = 'mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm';
  const input = {
    name: draft.name,
    description: draft.description,
    instructions: draft.instructions,
    defaultCategory: draft.defaultCategory,
  };

  if (!canManage) {
    return (
      <li className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
        <p className="font-medium text-slate-900">{draft.name} {draft.isDefault && <span className="text-xs text-slate-500">({t('templates.default')})</span>}</p>
        <p className="text-slate-500">{t(`category.${draft.defaultCategory}`)}</p>
        <p className="mt-2 whitespace-pre-line text-slate-700">{draft.instructions}</p>
      </li>
    );
  }
  return (
    <li className="space-y-2 rounded-lg border border-slate-200 bg-white p-4 text-sm">
      <label className="block">{t('templates.name')}<input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className={field} /></label>
      <label className="block">{t('templates.description')}<input value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} className={field} /></label>
      <label className="block">{t('templates.instructions')}<textarea rows={5} value={draft.instructions} onChange={(e) => setDraft({ ...draft, instructions: e.target.value })} className={field} /></label>
      <label className="block">{t('templates.defaultCategory')}
        <select value={draft.defaultCategory} onChange={(e) => setDraft({ ...draft, defaultCategory: e.target.value as Draft['defaultCategory'] })} className={field}>
          {ARTICLE_CREATE_CATEGORIES.map((c) => <option key={c} value={c}>{t(`category.${c}`)}</option>)}
        </select>
      </label>
      {message && <p role="alert" className="text-sm text-red-600">{message}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={() => void act(() => (draft.id ? updateTemplateAction(draft.id, input) : createTemplateAction(input)))} className="rounded-lg bg-primaryColor px-4 py-2 text-sm font-semibold text-white hover:bg-primaryHover">
          {t('templates.save')}
        </button>
        {draft.id && !draft.isDefault && (
          <button type="button" onClick={() => { if (window.confirm(t('templates.delete'))) void act(() => deleteTemplateAction(draft.id!)); }} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-red-600">
            {t('templates.delete')}
          </button>
        )}
      </div>
    </li>
  );
}

export default function TemplateManager() {
  const t = useTranslations('admin.studio.templates');
  const { can } = usePermissions();
  const canManage = can('studio.templates.manage');
  const [templates, setTemplates] = useState<Draft[]>([]);

  const load = useCallback(async () => {
    const result = await listTemplatesAction();
    if (result.ok) setTemplates(result.data);
  }, []);
  useEffect(() => {
    void listTemplatesAction().then((result) => {
      if (result.ok) setTemplates(result.data);
    });
  }, []);

  return (
    <section className="space-y-4">
      {canManage && (
        <button type="button" onClick={() => setTemplates((list) => [...list, EMPTY])} className="rounded-lg border border-slate-200 px-4 py-2 text-sm">
          {t('new')}
        </button>
      )}
      <ul className="space-y-3">
        {templates.map((template, i) => (
          <Card key={template.id ?? `new-${i}`} template={template} canManage={canManage} onChanged={() => void load()} />
        ))}
      </ul>
    </section>
  );
}
