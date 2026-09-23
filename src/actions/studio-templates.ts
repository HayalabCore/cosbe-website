'use server';

import { z } from 'zod';
import { requirePermission } from '@/lib/authz';
import { ARTICLE_CREATE_CATEGORIES } from '@/lib/api/article-create-metadata';
import type { StudioResult } from '@/lib/studio/action-types';
import { createTemplate, deleteTemplate, getTemplate, listTemplates, updateTemplate } from '@/generator/pieces/pieces-repository';

const fields = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(300).default(''),
  instructions: z.string().trim().min(1).max(4000),
  defaultCategory: z.enum(ARTICLE_CREATE_CATEGORIES),
});
const uuid = z.uuid();

export type TemplateDTO = z.infer<typeof fields> & { id: string; isDefault: boolean };

export async function listTemplatesAction(): Promise<StudioResult<TemplateDTO[]>> {
  await requirePermission('studio.use');
  const rows = await listTemplates();
  return {
    ok: true,
    data: rows.map((t) => ({
      id: t.id, name: t.name, description: t.description, instructions: t.instructions,
      defaultCategory: t.defaultCategory as TemplateDTO['defaultCategory'], isDefault: t.isDefault,
    })),
  };
}

export async function createTemplateAction(input: z.input<typeof fields>): Promise<StudioResult<{ templateId: string }>> {
  const ctx = await requirePermission('studio.templates.manage');
  const parsed = fields.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'INVALID_INPUT' };
  const row = await createTemplate({ ...parsed.data, createdById: ctx.admin.id });
  return { ok: true, data: { templateId: row.id } };
}

export async function updateTemplateAction(id: string, input: z.input<typeof fields>): Promise<StudioResult<undefined>> {
  await requirePermission('studio.templates.manage');
  const parsed = fields.safeParse(input);
  if (!uuid.safeParse(id).success || !parsed.success) return { ok: false, error: 'INVALID_INPUT' };
  await updateTemplate(id, parsed.data);
  return { ok: true, data: undefined };
}

export async function deleteTemplateAction(id: string): Promise<StudioResult<undefined>> {
  await requirePermission('studio.templates.manage');
  if (!uuid.safeParse(id).success) return { ok: false, error: 'INVALID_INPUT' };
  const template = await getTemplate(id);
  if (!template) return { ok: false, error: 'NOT_FOUND' };
  if (template.isDefault) return { ok: false, error: 'BLOCKED', reason: 'DEFAULT_TEMPLATE' };
  await deleteTemplate(id);
  return { ok: true, data: undefined };
}
