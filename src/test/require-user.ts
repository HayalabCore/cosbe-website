import { vi } from 'vitest';
import { requireUser } from '@/lib/require-user';

const authed = {
  user: { id: 'user-1', email: 'admin@test.local' },
  supabase: { storage: { from: vi.fn() } },
};

export function authedUser() {
  vi.mocked(requireUser).mockResolvedValue(authed as never);
}

export function unauth() {
  vi.mocked(requireUser).mockRejectedValue(new Error('Unauthorized'));
}
