import { describe, expect, it } from 'vitest';
import { statusChangePermissions } from './article-status-permissions';

describe('statusChangePermissions', () => {
  it('no change needs nothing extra', () => {
    expect(statusChangePermissions('published', 'published')).toEqual([]);
    expect(statusChangePermissions('draft', 'draft')).toEqual([]);
  });
  it('publishing and unpublishing need articles.publish', () => {
    expect(statusChangePermissions('draft', 'published')).toEqual([
      'articles.publish',
    ]);
    expect(statusChangePermissions('published', 'draft')).toEqual([
      'articles.publish',
    ]);
  });
  it('archiving and restoring need articles.archive', () => {
    expect(statusChangePermissions('draft', 'archived')).toEqual([
      'articles.archive',
    ]);
    expect(statusChangePermissions('archived', 'draft')).toEqual([
      'articles.archive',
    ]);
  });
  it('published <-> archived needs both', () => {
    expect(statusChangePermissions('published', 'archived')).toEqual([
      'articles.publish',
      'articles.archive',
    ]);
  });
});
