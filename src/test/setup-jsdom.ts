import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'https://example.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'test-anon-key';

afterEach(() => {
  cleanup();
});

vi.stubGlobal(
  'alert',
  vi.fn(() => undefined)
);
vi.stubGlobal(
  'confirm',
  vi.fn(() => true)
);
