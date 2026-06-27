'use client';

import { useCallback, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type RowSelectionState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  archiveArticleAction,
  archiveArticlesAction,
  deleteArticlesAction,
  publishArticleAction,
  publishArticlesAction,
  restoreArticleAction,
  unpublishArticleAction,
  unpublishArticlesAction,
} from '@/actions/articles';
import AdminCheckbox from '@/components/admin/AdminCheckbox';
import type { ArticleListItem, ArticleStatus } from '@/types';

const STATUSES: ArticleStatus[] = ['draft', 'published', 'archived'];

const CATEGORY_CLS: Record<string, string> = {
  'useful-info': 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  'case-study': 'bg-purple-50 text-purple-700 ring-1 ring-purple-200',
  video: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
  notice: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
};

const STATUS_STYLE: Record<string, { dot: string; cls: string }> = {
  published: {
    dot: 'bg-emerald-500',
    cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  },
  draft: {
    dot: 'bg-amber-400',
    cls: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  },
  archived: {
    dot: 'bg-slate-400',
    cls: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
  },
};

const STATUS_BADGE: Record<ArticleStatus, { on: string }> = {
  draft: { on: 'bg-amber-100 text-amber-800 ring-1 ring-amber-300' },
  published: { on: 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300' },
  archived: { on: 'bg-slate-200 text-slate-700 ring-1 ring-slate-300' },
};

function SortHeader({
  label,
  sorted,
  onClick,
}: {
  label: string;
  sorted: false | 'asc' | 'desc';
  onClick?: (e: unknown) => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500 hover:text-slate-700"
    >
      {label}
      <span className="text-slate-300">
        {sorted === 'asc' ? '▲' : sorted === 'desc' ? '▼' : '↕'}
      </span>
    </button>
  );
}

type Props = { items: ArticleListItem[] };

export default function DashboardClient({ items }: Props) {
  const t = useTranslations('admin.dashboard');
  const locale = useLocale();
  const dateLocale = locale === 'ja' ? 'ja-JP' : 'en-US';
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [sorting, setSorting] = useState<SortingState>([
    { id: 'createdAt', desc: true },
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [pendingRowId, setPendingRowId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [bulkPending, setBulkPending] = useState(false);

  const counts = useMemo(() => {
    const c = { total: items.length, published: 0, draft: 0, archived: 0 };
    for (const it of items) {
      if (it.status === 'published') c.published++;
      else if (it.status === 'draft') c.draft++;
      else if (it.status === 'archived') c.archived++;
    }
    return c;
  }, [items]);

  function fmtDate(iso: string | null) {
    if (!iso) return null;
    return new Date(iso).toLocaleDateString(dateLocale, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  function sourcePath(url: string) {
    try {
      return new URL(url).pathname;
    } catch {
      return url;
    }
  }

  function categoryLabel(k: string) {
    if (k === 'useful-info') return t('categoryUsefulInfo');
    if (k === 'case-study') return t('categoryCaseStudy');
    if (k === 'video') return t('categoryVideo');
    if (k === 'notice') return t('categoryNotice');
    return k;
  }

  function statusLabel(k: string) {
    if (k === 'published') return t('statusPublished');
    if (k === 'draft') return t('statusDraft');
    if (k === 'archived') return t('statusArchived');
    return k;
  }

  const runRowAction = useCallback(
    async (id: string, fn: () => Promise<void>) => {
      setActionError(null);
      setPendingRowId(id);
      try {
        await fn();
        startTransition(() => router.refresh());
      } catch (e) {
        console.error(e);
        setActionError(t('actionFailed'));
      } finally {
        setPendingRowId(null);
      }
    },
    [router, t]
  );

  const columns = useMemo<ColumnDef<ArticleListItem>[]>(
    () => [
      {
        id: 'select',
        enableSorting: false,
        header: ({ table }) => (
          <AdminCheckbox
            aria-label="Select all"
            checked={table.getIsAllRowsSelected()}
            indeterminate={table.getIsSomeRowsSelected()}
            onChange={table.getToggleAllRowsSelectedHandler()}
          />
        ),
        cell: ({ row }) => (
          <AdminCheckbox
            aria-label="Select row"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
          />
        ),
      },
      {
        accessorKey: 'title',
        header: ({ column }) => (
          <SortHeader
            label={t('tableTitle')}
            sorted={column.getIsSorted()}
            onClick={column.getToggleSortingHandler()}
          />
        ),
        cell: ({ row }) => {
          const a = row.original;
          const created = fmtDate(a.createdAt);
          return (
            <div className="min-w-0">
              <Link
                href={`/admin/posts/${a.id}`}
                className="block max-w-md truncate font-medium text-slate-900 hover:text-primaryColor transition-colors"
              >
                {a.title}
              </Link>
              <p className="mt-0.5 max-w-md truncate text-xs text-slate-400">
                <span className="font-mono">{a.slug}</span>
                {created && (
                  <span className="text-slate-300"> · {created}</span>
                )}
              </p>
              {a.sourceUrl && (
                <a
                  href={a.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={a.sourceUrl}
                  className="mt-1 inline-flex max-w-full items-center gap-1 text-[11px] text-slate-400 hover:text-primaryColor transition-colors"
                >
                  <svg
                    className="w-3 h-3 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                  <span className="truncate font-mono">
                    {t('importedFrom')}: {sourcePath(a.sourceUrl)}
                  </span>
                </a>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'category',
        filterFn: (row, id, value: string) =>
          !value || row.getValue(id) === value,
        header: ({ column }) => (
          <SortHeader
            label={t('tableCategory')}
            sorted={column.getIsSorted()}
            onClick={column.getToggleSortingHandler()}
          />
        ),
        cell: ({ getValue }) => {
          const cat = getValue<string>();
          return (
            <span
              className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
                CATEGORY_CLS[cat] ?? 'bg-slate-100 text-slate-600'
              }`}
            >
              {categoryLabel(cat)}
            </span>
          );
        },
      },
      {
        accessorKey: 'status',
        filterFn: (row, id, value: string[]) =>
          !value?.length || value.includes(row.getValue(id)),
        header: ({ column }) => (
          <SortHeader
            label={t('tableStatus')}
            sorted={column.getIsSorted()}
            onClick={column.getToggleSortingHandler()}
          />
        ),
        cell: ({ getValue }) => {
          const s = getValue<string>();
          const st = STATUS_STYLE[s] ?? STATUS_STYLE.draft;
          return (
            <span
              className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ${st.cls}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
              {statusLabel(s)}
            </span>
          );
        },
      },
      {
        accessorKey: 'createdAt',
        header: ({ column }) => (
          <SortHeader
            label={t('tableCreated')}
            sorted={column.getIsSorted()}
            onClick={column.getToggleSortingHandler()}
          />
        ),
        cell: ({ getValue }) => (
          <span className="text-sm text-slate-500">
            {fmtDate(getValue<string>()) ?? '—'}
          </span>
        ),
      },
      {
        accessorKey: 'publishedAt',
        sortUndefined: 'last',
        header: ({ column }) => (
          <SortHeader
            label={t('tablePublished')}
            sorted={column.getIsSorted()}
            onClick={column.getToggleSortingHandler()}
          />
        ),
        cell: ({ getValue }) => (
          <span className="text-sm text-slate-400">
            {fmtDate(getValue<string | null>()) ?? '—'}
          </span>
        ),
      },
      {
        id: 'actions',
        enableSorting: false,
        header: () => (
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t('tableActions')}
          </span>
        ),
        cell: ({ row }) => {
          const a = row.original;
          const rowBusy = pendingRowId === a.id;
          return (
            <div className="flex items-center justify-end gap-1">
              <Link
                href={`/admin/posts/${a.id}`}
                title={t('editTitle')}
                className="p-1.5 rounded-lg text-slate-400 hover:text-primaryColor hover:bg-primaryColor/8 transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.75}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </Link>
              {a.status === 'published' ? (
                <button
                  type="button"
                  title={t('unpublishTitle')}
                  disabled={rowBusy}
                  onClick={() =>
                    void runRowAction(a.id, () => unpublishArticleAction(a.id))
                  }
                  className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors disabled:opacity-40"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.75}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                    />
                  </svg>
                </button>
              ) : (
                <button
                  type="button"
                  title={t('publishTitle')}
                  disabled={rowBusy}
                  onClick={() =>
                    void runRowAction(a.id, () => publishArticleAction(a.id))
                  }
                  className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-40"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.75}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </button>
              )}
              {a.status === 'archived' ? (
                <button
                  type="button"
                  title={t('restoreTitle')}
                  disabled={rowBusy}
                  onClick={() =>
                    void runRowAction(a.id, () => restoreArticleAction(a.id))
                  }
                  className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-40"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.75}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </button>
              ) : (
                <button
                  type="button"
                  title={t('archiveTitle')}
                  disabled={rowBusy}
                  onClick={() => {
                    if (!confirm(t('archiveConfirm', { title: a.title })))
                      return;
                    void runRowAction(a.id, () =>
                      archiveArticleAction(a.id, a.slug, a.category)
                    );
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors disabled:opacity-40"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.75}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                    />
                  </svg>
                </button>
              )}
            </div>
          );
        },
      },
    ],
    [t, pendingRowId, runRowAction, dateLocale] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // react-hooks/incompatible-library: useReactTable returns non-memoizable
  // functions — expected for TanStack Table, safe to ignore here.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: items,
    columns,
    state: { sorting, columnFilters, globalFilter, rowSelection },
    getRowId: (r) => r.id,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    globalFilterFn: (row, _columnId, value: string) => {
      const q = value.trim().toLowerCase();
      if (!q) return true;
      const a = row.original;
      return (
        a.title.toLowerCase().includes(q) ||
        (a.titleEn ?? '').toLowerCase().includes(q) ||
        a.slug.toLowerCase().includes(q)
      );
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 20 },
      // Created date is shown under the title; keep the column for default
      // sorting but don't render it.
      columnVisibility: { createdAt: false },
    },
  });

  const statusFilter =
    (table.getColumn('status')?.getFilterValue() as string[] | undefined) ?? [];
  const categoryFilter =
    (table.getColumn('category')?.getFilterValue() as string | undefined) ?? '';

  function toggleStatus(s: ArticleStatus) {
    const next = statusFilter.includes(s)
      ? statusFilter.filter((x) => x !== s)
      : [...statusFilter, s];
    table.getColumn('status')?.setFilterValue(next.length ? next : undefined);
    table.resetPageIndex();
  }

  const selectedIds = table
    .getSelectedRowModel()
    .rows.map((r) => r.original.id);
  const selectedCount = selectedIds.length;

  async function runBulk(fn: (ids: string[]) => Promise<void>) {
    if (selectedIds.length === 0) return;
    setActionError(null);
    setBulkPending(true);
    try {
      await fn(selectedIds);
      table.resetRowSelection();
      startTransition(() => router.refresh());
    } catch (e) {
      console.error(e);
      setActionError(t('actionFailed'));
    } finally {
      setBulkPending(false);
    }
  }

  const pageRows = table.getRowModel().rows;
  const filteredCount = table.getFilteredRowModel().rows.length;
  const pageIndex = table.getState().pagination.pageIndex;
  const pageSize = table.getState().pagination.pageSize;

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{t('title')}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{t('subtitle')}</p>
        </div>
        <Link
          href="/admin/posts/new"
          className="inline-flex items-center gap-2 rounded-lg bg-primaryColor px-4 py-2.5 text-sm font-semibold text-white hover:bg-primaryHover transition-colors shadow-sm"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4v16m8-8H4"
            />
          </svg>
          {t('newPost')}
        </Link>
      </div>

      {isPending && (
        <div className="fixed top-0 left-0 right-0 z-50 h-1 overflow-hidden bg-primaryColor/15">
          <div className="animate-indeterminate h-full w-1/4 rounded-full bg-primaryColor" />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px]">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="search"
            placeholder={t('searchPlaceholder')}
            value={globalFilter}
            onChange={(e) => {
              setGlobalFilter(e.target.value);
              table.resetPageIndex();
            }}
            className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primaryColor focus:outline-none focus:ring-2 focus:ring-primaryColor/15 transition-all shadow-sm"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              table.getColumn('status')?.setFilterValue(undefined);
              table.resetPageIndex();
            }}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              statusFilter.length === 0
                ? 'bg-primaryColor text-white'
                : 'bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50'
            }`}
          >
            {t('filterStatusAll')}
            <span className="tabular-nums opacity-70">{counts.total}</span>
          </button>
          {STATUSES.map((s) => {
            const active = statusFilter.includes(s);
            return (
              <button
                key={s}
                type="button"
                aria-pressed={active}
                onClick={() => toggleStatus(s)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  active
                    ? STATUS_BADGE[s].on
                    : 'bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50'
                }`}
              >
                {statusLabel(s)}
                <span className="tabular-nums opacity-70">{counts[s]}</span>
              </button>
            );
          })}
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => {
            table
              .getColumn('category')
              ?.setFilterValue(e.target.value || undefined);
            table.resetPageIndex();
          }}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-primaryColor focus:outline-none focus:ring-2 focus:ring-primaryColor/15 shadow-sm"
        >
          <option value="">{t('filterCategoryAll')}</option>
          <option value="useful-info">{t('categoryUsefulInfo')}</option>
          <option value="case-study">{t('categoryCaseStudy')}</option>
          <option value="video">{t('categoryVideo')}</option>
          <option value="notice">{t('categoryNotice')}</option>
        </select>
      </div>

      {actionError && (
        <div
          className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          {actionError}
        </div>
      )}

      {/* Bulk action bar — floats at bottom so it never shifts the table.
          Outer wrapper spans the content area (offset by the sidebar on lg) and
          flex-centers the bar; the bar animates vertically only (no transform
          conflict / horizontal jump). */}
      {selectedCount > 0 && (
        <div className="pointer-events-none fixed inset-x-0 lg:left-56 bottom-6 z-40 flex justify-center px-4">
          <div className="animate-bulkbar pointer-events-auto flex max-w-full flex-wrap items-center justify-center gap-1.5 rounded-2xl bg-slate-900 px-3 py-2.5 shadow-2xl ring-1 ring-black/10">
            <span className="inline-flex items-center gap-2 px-2 text-sm font-semibold text-white">
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primaryColor px-1.5 text-xs font-bold text-white tabular-nums">
                {selectedCount}
              </span>
              {t('selectedCount', { count: selectedCount })}
            </span>
            <span className="mx-1 h-5 w-px bg-white/15" />
            <button
              type="button"
              disabled={bulkPending}
              onClick={() => void runBulk(publishArticlesAction)}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-white/10 disabled:opacity-50 transition-colors"
            >
              {t('bulkPublish')}
            </button>
            <button
              type="button"
              disabled={bulkPending}
              onClick={() => void runBulk(unpublishArticlesAction)}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-white/10 disabled:opacity-50 transition-colors"
            >
              {t('bulkUnpublish')}
            </button>
            <button
              type="button"
              disabled={bulkPending}
              onClick={() => {
                if (!confirm(t('bulkArchiveConfirm', { count: selectedCount })))
                  return;
                void runBulk(archiveArticlesAction);
              }}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/10 disabled:opacity-50 transition-colors"
            >
              {t('bulkArchive')}
            </button>
            <button
              type="button"
              disabled={bulkPending}
              onClick={() => {
                if (!confirm(t('bulkDeleteConfirm', { count: selectedCount })))
                  return;
                void runBulk(deleteArticlesAction);
              }}
              className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-600 disabled:opacity-50 transition-colors"
            >
              {t('bulkDelete')}
            </button>
            <span className="mx-1 h-5 w-px bg-white/15" />
            <button
              type="button"
              onClick={() => table.resetRowSelection()}
              className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
            >
              {t('clearSelection')}
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div
        className={`rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden transition-opacity ${
          isPending || bulkPending ? 'opacity-60' : ''
        }`}
      >
        {filteredCount === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <p className="font-semibold text-slate-700 mb-1">
              {t('noPostsTitle')}
            </p>
            <p className="text-sm text-slate-400">
              {items.length === 0 ? t('noPostsEmpty') : t('noPostsFiltered')}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                {table.getHeaderGroups().map((hg) => (
                  <tr
                    key={hg.id}
                    className="border-b border-slate-100 bg-slate-50/80"
                  >
                    {hg.headers.map((header) => {
                      const hideCls =
                        header.column.id === 'category'
                          ? 'hidden md:table-cell'
                          : header.column.id === 'createdAt' ||
                              header.column.id === 'publishedAt'
                            ? 'hidden lg:table-cell'
                            : '';
                      return (
                        <th
                          key={header.id}
                          className={`px-4 py-3 text-left ${
                            header.column.id === 'actions' ? 'text-right' : ''
                          } ${header.column.id === 'select' ? 'w-10' : ''} ${hideCls}`}
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </th>
                      );
                    })}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pageRows.map((row) => (
                  <tr
                    key={row.id}
                    className={`transition-colors ${
                      row.getIsSelected()
                        ? 'bg-primaryColor/5'
                        : 'hover:bg-slate-50/70'
                    }`}
                  >
                    {row.getVisibleCells().map((cell) => {
                      const hideCls =
                        cell.column.id === 'category'
                          ? 'hidden md:table-cell'
                          : cell.column.id === 'createdAt' ||
                              cell.column.id === 'publishedAt'
                            ? 'hidden lg:table-cell'
                            : '';
                      return (
                        <td
                          key={cell.id}
                          className={`px-4 py-3.5 align-top ${hideCls}`}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {filteredCount > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4">
          <div className="flex items-center gap-3">
            <p className="text-xs text-slate-400">
              {t('showingRange', {
                start: pageIndex * pageSize + 1,
                end: Math.min((pageIndex + 1) * pageSize, filteredCount),
                total: filteredCount,
              })}
            </p>
            <select
              value={pageSize}
              onChange={(e) => table.setPageSize(Number(e.target.value))}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 focus:border-primaryColor focus:outline-none"
            >
              {[20, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {t('rowsPerPage', { count: n })}
                </option>
              ))}
            </select>
          </div>
          {table.getPageCount() > 1 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={!table.getCanPreviousPage()}
                onClick={() => table.previousPage()}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              >
                {t('prevPage')}
              </button>
              <span className="text-xs text-slate-500 tabular-nums">
                {t('pageIndicator', {
                  page: pageIndex + 1,
                  totalPages: table.getPageCount(),
                })}
              </span>
              <button
                type="button"
                disabled={!table.getCanNextPage()}
                onClick={() => table.nextPage()}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              >
                {t('nextPage')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
