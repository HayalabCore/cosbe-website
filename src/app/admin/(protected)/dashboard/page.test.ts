import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/authz', () => ({ hasPermission: vi.fn() }));
vi.mock('@/lib/articles-repository', () => ({ getArticles: vi.fn() }));
vi.mock('./DashboardClient', () => ({ default: () => null }));
vi.mock('@/components/admin/PermissionNeeded', () => ({
  default: () => null,
}));

import AdminDashboardPage from './page';
import { hasPermission } from '@/lib/authz';
import { getArticles } from '@/lib/articles-repository';
import PermissionNeeded from '@/components/admin/PermissionNeeded';

describe('AdminDashboardPage guard', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders PermissionNeeded and loads nothing without dashboard.view', async () => {
    vi.mocked(hasPermission).mockResolvedValue(false);
    const el = (await AdminDashboardPage()) as {
      type: unknown;
      props: { permission: string };
    };
    expect(el.type).toBe(PermissionNeeded);
    expect(el.props.permission).toBe('dashboard.view');
    expect(getArticles).not.toHaveBeenCalled();
  });

  it('loads articles with dashboard.view', async () => {
    vi.mocked(hasPermission).mockResolvedValue(true);
    vi.mocked(getArticles).mockResolvedValue([]);
    await AdminDashboardPage();
    expect(getArticles).toHaveBeenCalled();
  });
});
