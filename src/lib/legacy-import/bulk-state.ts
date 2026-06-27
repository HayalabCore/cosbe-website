import type { ImportPreviewPayload } from './types';

export type BulkRowStatus =
  | 'queued'
  | 'extracting'
  | 'ready'
  | 'error'
  | 'committing'
  | 'commitError';

export type BulkRow = {
  url: string;
  status: BulkRowStatus;
  payload?: ImportPreviewPayload;
  error?: string;
  included: boolean;
};

export type BulkState = { rows: BulkRow[] };

export type BulkAction =
  | { type: 'addUrls'; urls: string[] }
  | { type: 'removeUrls'; urls: string[] }
  | { type: 'setStatus'; url: string; status: BulkRowStatus; error?: string }
  | { type: 'setPayload'; url: string; payload: ImportPreviewPayload }
  | { type: 'patchPayload'; url: string; patch: Partial<ImportPreviewPayload> }
  | { type: 'toggleInclude'; url: string }
  | { type: 'setBatchInclude'; included: boolean }
  | { type: 'hydrate'; state: BulkState }
  | { type: 'reset' };

export const initialBulkState: BulkState = { rows: [] };

function mapRow(
  state: BulkState,
  url: string,
  fn: (row: BulkRow) => BulkRow
): BulkState {
  return { rows: state.rows.map((r) => (r.url === url ? fn(r) : r)) };
}

export function bulkReducer(state: BulkState, action: BulkAction): BulkState {
  switch (action.type) {
    case 'addUrls': {
      const existing = new Set(state.rows.map((r) => r.url));
      const additions: BulkRow[] = action.urls
        .filter((u) => !existing.has(u))
        .map((url) => ({ url, status: 'queued', included: true }));
      return { rows: [...state.rows, ...additions] };
    }
    case 'removeUrls': {
      const drop = new Set(action.urls);
      return { rows: state.rows.filter((r) => !drop.has(r.url)) };
    }
    case 'setStatus':
      return mapRow(state, action.url, (r) => ({
        ...r,
        status: action.status,
        error: action.error,
      }));
    case 'setPayload':
      return mapRow(state, action.url, (r) => ({
        ...r,
        status: 'ready',
        error: undefined,
        payload: action.payload,
      }));
    case 'patchPayload':
      return mapRow(state, action.url, (r) =>
        r.payload ? { ...r, payload: { ...r.payload, ...action.patch } } : r
      );
    case 'toggleInclude':
      return mapRow(state, action.url, (r) => ({
        ...r,
        included: !r.included,
      }));
    case 'setBatchInclude':
      return {
        rows: state.rows.map((r) =>
          r.status === 'ready' ? { ...r, included: action.included } : r
        ),
      };
    case 'hydrate':
      return action.state;
    case 'reset':
      return { rows: [] };
    default:
      return state;
  }
}

export function findDuplicateSlugs(rows: BulkRow[]): Set<string> {
  const counts = new Map<string, number>();
  for (const r of rows) {
    if (r.status === 'ready' && r.payload) {
      counts.set(r.payload.slug, (counts.get(r.payload.slug) ?? 0) + 1);
    }
  }
  return new Set([...counts].filter(([, n]) => n > 1).map(([slug]) => slug));
}
