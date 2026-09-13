import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderAdmin } from '@/test/render-admin';
import {
  AdminCardGridSkeleton,
  AdminEditorSkeleton,
  AdminFormSkeleton,
  AdminImportSkeleton,
  AdminMediaGridSkeleton,
  AdminPageHeaderSkeleton,
  AdminTableSkeleton,
  AdminTranslationsSkeleton,
} from './AdminSkeletons';

describe('AdminSkeletons', () => {
  it('exposes a status landmark with the given label', () => {
    renderAdmin(<AdminTableSkeleton aria-label="Loading…" />);
    expect(screen.getByRole('status', { name: 'Loading…' })).toBeInTheDocument();
  });

  it('renders each skeleton variant without crashing', () => {
    renderAdmin(
      <>
        <AdminPageHeaderSkeleton />
        <AdminCardGridSkeleton />
        <AdminMediaGridSkeleton />
        <AdminEditorSkeleton />
        <AdminFormSkeleton />
        <AdminTranslationsSkeleton />
        <AdminImportSkeleton />
      </>
    );
    expect(screen.getAllByRole('status').length).toBeGreaterThanOrEqual(6);
  });
});
