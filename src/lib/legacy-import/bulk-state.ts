import type { ImportPreviewPayload } from './types';

export type BulkRowStatus =
  | 'queued'
  | 'extracting'
  | 'ready'
  | 'error'
  | 'committing'
  | 'committed'
  | 'commitError';

export type BulkRow = {
  url: string;
  status: BulkRowStatus;
  payload?: ImportPreviewPayload;
  error?: string;
  included: boolean;
  draftId?: string;
};

export type BulkPhase = 'input' | 'review' | 'summary';

export type BulkState = { phase: BulkPhase; rows: BulkRow[] };

export type BulkAction =
  | { type: 'setStatus'; url: string; status: BulkRowStatus; error?: string }
  | { type: 'setPayload'; url: string; payload: ImportPreviewPayload }
  | { type: 'patchPayload'; url: string; patch: Partial<ImportPreviewPayload> }
  | { type: 'toggleInclude'; url: string }
  | { type: 'setBatchInclude'; included: boolean }
  | { type: 'setCommitted'; url: string; draftId: string }
  | { type: 'setPhase'; phase: BulkPhase }
  | { type: 'hydrate'; state: BulkState }
  | { type: 'reset' };

export const initialBulkState: BulkState = { phase: 'input', rows: [] };

export function bulkInit(urls: string[]): BulkState {
  return {
    phase: 'review',
    rows: urls.map((url) => ({ url, status: 'queued', included: true })),
  };
}

function mapRow(
  state: BulkState,
  url: string,
  fn: (row: BulkRow) => BulkRow
): BulkState {
  return { ...state, rows: state.rows.map((r) => (r.url === url ? fn(r) : r)) };
}

export function bulkReducer(state: BulkState, action: BulkAction): BulkState {
  switch (action.type) {
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
        ...state,
        rows: state.rows.map((r) =>
          r.status === 'ready' ? { ...r, included: action.included } : r
        ),
      };
    case 'setCommitted':
      return mapRow(state, action.url, (r) => ({
        ...r,
        status: 'committed',
        draftId: action.draftId,
        error: undefined,
      }));
    case 'setPhase':
      return { ...state, phase: action.phase };
    case 'hydrate':
      return action.state;
    case 'reset':
      return { phase: 'input', rows: [] };
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
