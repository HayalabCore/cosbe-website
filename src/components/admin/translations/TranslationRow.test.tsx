import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderAdmin } from '@/test/render-admin';

const saveTranslation = vi.fn();
const getTranslationHistory = vi.fn();
const translateKeyToEnglish = vi.fn();
const restoreTranslation = vi.fn();

vi.mock('@/actions/translations', () => ({
  saveTranslation: (...a: unknown[]) => saveTranslation(...a),
  getTranslationHistory: (...a: unknown[]) => getTranslationHistory(...a),
  translateKeyToEnglish: (...a: unknown[]) => translateKeyToEnglish(...a),
  restoreTranslation: (...a: unknown[]) => restoreTranslation(...a),
}));

import { TranslationRow } from './TranslationRow';

const row = {
  keyPath: 'nav.home',
  ja: 'ホーム',
  en: 'Home',
  updatedAtJa: null,
  updatedAtEn: null,
};

describe('TranslationRow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    saveTranslation.mockResolvedValue({ ok: true });
    getTranslationHistory.mockResolvedValue([]);
  });

  it('saves English on blur after a change', async () => {
    renderAdmin(<TranslationRow row={row} />);
    const en = screen.getAllByRole('textbox')[1];
    fireEvent.change(en, { target: { value: 'Homepage' } });
    fireEvent.blur(en);
    await waitFor(() =>
      expect(saveTranslation).toHaveBeenCalledWith({
        keyPath: 'nav.home',
        locale: 'en',
        value: 'Homepage',
      })
    );
  });

  it('loads history when the history button is clicked', async () => {
    const user = userEvent.setup();
    renderAdmin(<TranslationRow row={row} />);
    await user.click(screen.getByRole('button', { name: 'History' }));
    await waitFor(() => expect(getTranslationHistory).toHaveBeenCalled());
  });
});
