import { createTranslator } from 'next-intl';
import { describe, expect, it } from 'vitest';
import adminEn from '../../../../../messages/admin-en.json';
import adminJa from '../../../../../messages/admin-ja.json';
import { BLOCK_REASONS } from '@/generator/pieces/stages';
import { RUN_ERROR_CODES } from '@/generator/runs/run-types';
import { errorText, historyLabel, runErrorText } from './errorText';

const tr = (locale: 'en' | 'ja') =>
  createTranslator({
    locale,
    messages: { admin: locale === 'en' ? adminEn : adminJa },
    namespace: 'admin.studio',
  }) as unknown as Parameters<typeof errorText>[0];

describe('studio error text', () => {
  it('translates stage-rule reasons', () => {
    expect(errorText(tr('ja'), { error: 'BLOCKED', reason: 'NO_GOAL' })).toBe(
      adminJa.studio.workspace.reasons.NO_GOAL
    );
  });

  it('falls back to a generic message for unknown reasons and codes', () => {
    expect(errorText(tr('en'), { error: 'BLOCKED', reason: 'An English sentence.' })).toBe(
      adminEn.studio.workspace.errors.FAILED
    );
    expect(errorText(tr('en'), { error: 'INVALID_INPUT' })).toBe(
      adminEn.studio.workspace.errors.INVALID_INPUT
    );
  });

  it('translates run errors, keeping the section heading', () => {
    expect(runErrorText(tr('ja'), 'NO_MATERIAL:導入効果')).toContain('導入効果');
    expect(runErrorText(tr('en'), 'FORBIDDEN')).toBe(
      adminEn.studio.workspace.runErrors.FORBIDDEN
    );
    expect(runErrorText(tr('en'), 'socket hang up')).toBe(
      adminEn.studio.workspace.runErrors.RUN_FAILED
    );
  });

  it('labels history entries, including older free-text reasons', () => {
    expect(historyLabel(tr('en'), 'rewrite:課題')).toContain('課題');
    expect(historyLabel(tr('en'), 'edit outline')).toBe(
      adminEn.studio.workspace.history.edit_outline
    );
  });

  it('has every code in both locales', () => {
    for (const messages of [adminEn, adminJa]) {
      const w = messages.studio.workspace as unknown as Record<string, Record<string, string>>;
      for (const r of BLOCK_REASONS) expect(w.reasons[r], r).toBeTruthy();
      for (const r of RUN_ERROR_CODES) expect(w.runErrors[r], r).toBeTruthy();
      for (const k of ['outline', 'write', 'translate', 'rewrite', 'edit_outline', 'change_sources', 'before_undo'])
        expect(w.history[k], k).toBeTruthy();
    }
  });
});
