'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { translateBlockEnAction } from '@/actions/block-translation';
import type { TableBlock } from '@/types';
import BlockLocaleTabs from '@/components/admin/BlockLocaleTabs';

const INPUT_CLS =
  'w-full bg-transparent px-2.5 py-2 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none transition-colors';

const HEADER_INPUT_CLS =
  'w-full bg-transparent px-2.5 py-2 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none transition-colors';

const CAPTION_CLS =
  'w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primaryColor focus:bg-white focus:outline-none focus:ring-2 focus:ring-primaryColor/15 transition-all';

function clampRows(rows: string[][], colCount: number): string[][] {
  return rows.map((row) => {
    if (row.length === colCount) return row;
    if (row.length < colCount)
      return [...row, ...Array(colCount - row.length).fill('')];
    return row.slice(0, colCount);
  });
}

export default function TableBlockEditor({
  block,
  onChange,
}: {
  block: TableBlock;
  onChange: (b: TableBlock) => void;
}) {
  const t = useTranslations('admin.table');
  const te = useTranslations('admin.blockLocale');
  const [tab, setTab] = useState<'original' | 'english'>('original');
  const [generating, setGenerating] = useState(false);

  const colCount = block.headers.length;
  const headersEn: string[] = (block.headersEn ?? []).concat(
    Array(Math.max(0, colCount - (block.headersEn?.length ?? 0))).fill('')
  );
  const rowsEn: string[][] = block.rows.map((row, ri) =>
    row.map((_, ci) => block.rowsEn?.[ri]?.[ci] ?? '')
  );

  function updateHeader(ci: number, value: string) {
    const headers = [...block.headers];
    headers[ci] = value;
    onChange({ ...block, headers });
  }

  function updateHeaderEn(ci: number, value: string) {
    const next = [...headersEn];
    next[ci] = value;
    onChange({ ...block, headersEn: next });
  }

  function updateCell(ri: number, ci: number, value: string) {
    const rows = block.rows.map((r) => [...r]);
    rows[ri][ci] = value;
    onChange({ ...block, rows });
  }

  function updateCellEn(ri: number, ci: number, value: string) {
    const next = rowsEn.map((r) => [...r]);
    next[ri][ci] = value;
    onChange({ ...block, rowsEn: next });
  }

  function addColumn() {
    onChange({
      ...block,
      headers: [...block.headers, ''],
      headersEn: [...headersEn, ''],
      rows: block.rows.map((r) => [...r, '']),
      rowsEn: rowsEn.map((r) => [...r, '']),
    });
  }

  function removeColumn(ci: number) {
    if (colCount <= 1) return;
    const colHasData =
      block.headers[ci]?.trim() || block.rows.some((r) => r[ci]?.trim());
    if (colHasData && !window.confirm(t('removeColumnConfirm', { n: ci + 1 })))
      return;
    onChange({
      ...block,
      headers: block.headers.filter((_, i) => i !== ci),
      headersEn: headersEn.filter((_, i) => i !== ci),
      rows: block.rows.map((r) => r.filter((_, i) => i !== ci)),
      rowsEn: rowsEn.map((r) => r.filter((_, i) => i !== ci)),
    });
  }

  function addRow() {
    const rows = [...block.rows, Array(colCount).fill('')];
    const rowsEnNext = [...rowsEn, Array(colCount).fill('')];
    onChange({ ...block, rows: clampRows(rows, colCount), rowsEn: rowsEnNext });
  }

  function removeRow(ri: number) {
    if (block.rows.length <= 1) return;
    const rowHasData = block.rows[ri]?.some((c) => c.trim());
    if (rowHasData && !window.confirm(t('removeRowConfirm', { n: ri + 1 })))
      return;
    onChange({
      ...block,
      rows: block.rows.filter((_, i) => i !== ri),
      rowsEn: rowsEn.filter((_, i) => i !== ri),
    });
  }

  async function handleGenerate() {
    setGenerating(true);
    try {
      const result = await translateBlockEnAction({
        type: 'table',
        title: block.title,
        subtitle: block.subtitle,
        headers: block.headers,
        rows: block.rows,
        caption: block.caption,
      });
      if (result.type === 'table') {
        onChange({
          ...block,
          titleEn: result.titleEn,
          subtitleEn: result.subtitleEn,
          headersEn: result.headersEn,
          rowsEn: result.rowsEn,
          captionEn: result.captionEn,
        });
        setTab('english');
      }
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : 'Translation failed');
    } finally {
      setGenerating(false);
    }
  }

  const hasPrimary =
    block.headers.some((h) => h.trim()) ||
    block.rows.some((r) => r.some((c) => c.trim()));
  const isOriginal = tab === 'original';

  // grid: row-number gutter + N data columns + action gutter
  const gridCols = `40px repeat(${colCount}, minmax(100px, 1fr)) 36px`;

  return (
    <div className="space-y-3">
      <BlockLocaleTabs
        tab={tab}
        onTabChange={setTab}
        onGenerateEnglish={handleGenerate}
        generating={generating}
        generateDisabled={!hasPrimary}
      />

      {/* Title & subtitle */}
      <div className="space-y-1.5">
        <input
          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:border-primaryColor focus:bg-white focus:outline-none focus:ring-2 focus:ring-primaryColor/15 transition-all"
          placeholder={
            isOriginal ? t('titlePlaceholder') : te('englishPlaceholder')
          }
          value={isOriginal ? (block.title ?? '') : (block.titleEn ?? '')}
          onChange={(e) =>
            isOriginal
              ? onChange({ ...block, title: e.target.value || undefined })
              : onChange({ ...block, titleEn: e.target.value || undefined })
          }
        />
        <input
          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 placeholder:text-slate-400 focus:border-primaryColor focus:bg-white focus:outline-none focus:ring-2 focus:ring-primaryColor/15 transition-all"
          placeholder={
            isOriginal ? t('subtitlePlaceholder') : te('englishPlaceholder')
          }
          value={isOriginal ? (block.subtitle ?? '') : (block.subtitleEn ?? '')}
          onChange={(e) =>
            isOriginal
              ? onChange({ ...block, subtitle: e.target.value || undefined })
              : onChange({ ...block, subtitleEn: e.target.value || undefined })
          }
        />
      </div>

      <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
        {/* Column control bar — only in edit mode */}
        {isOriginal && (
          <div
            className="grid items-center border-b border-slate-200 bg-slate-50/80 px-0"
            style={{ gridTemplateColumns: gridCols }}
          >
            {/* gutter */}
            <div />
            {block.headers.map((_, ci) => (
              <div
                key={ci}
                className="flex items-center justify-between px-2.5 py-1.5 border-l border-slate-200"
              >
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 select-none">
                  {t('colLabel', { n: ci + 1 })}
                </span>
                <button
                  type="button"
                  title={t('removeColumn')}
                  disabled={colCount <= 1}
                  onClick={() => removeColumn(ci)}
                  className="flex items-center justify-center w-4 h-4 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 disabled:opacity-0 disabled:pointer-events-none transition-colors"
                >
                  <svg
                    className="w-2.5 h-2.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            ))}
            {/* add-column button */}
            <div className="flex items-center justify-center border-l border-slate-200 py-1.5">
              <button
                type="button"
                title={t('addColumn')}
                onClick={addColumn}
                className="flex items-center justify-center w-5 h-5 rounded text-slate-400 hover:text-primaryColor hover:bg-primaryColor/8 transition-colors"
              >
                <svg
                  className="w-3 h-3"
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
              </button>
            </div>
          </div>
        )}

        {/* Header row */}
        <div
          className="grid border-b-2 border-slate-200 bg-slate-50"
          style={{ gridTemplateColumns: gridCols }}
        >
          {/* row label gutter */}
          <div className="flex items-center justify-center py-2">
            <svg
              className="w-3 h-3 text-slate-300"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 9h18M3 15h18M9 3v18M15 3v18"
              />
            </svg>
          </div>

          {(isOriginal ? block.headers : headersEn).map((header, ci) => (
            <div
              key={ci}
              className="border-l border-slate-200 focus-within:bg-white focus-within:ring-1 focus-within:ring-primaryColor/20 transition-colors"
            >
              <input
                className={HEADER_INPUT_CLS}
                placeholder={`${t('headerPlaceholder')} ${ci + 1}`}
                value={header}
                onChange={(e) =>
                  isOriginal
                    ? updateHeader(ci, e.target.value)
                    : updateHeaderEn(ci, e.target.value)
                }
              />
            </div>
          ))}

          {/* action gutter placeholder */}
          <div className="border-l border-slate-200" />
        </div>

        {/* Data rows */}
        {block.rows.map((row, ri) => (
          <div
            key={ri}
            className="group/row grid border-b border-slate-100 last:border-b-0 hover:bg-slate-50/40 transition-colors"
            style={{ gridTemplateColumns: gridCols }}
          >
            {/* row number gutter */}
            <div className="flex items-center justify-center py-1">
              <span className="text-[10px] font-medium text-slate-300 select-none group-hover/row:text-slate-400 transition-colors">
                {ri + 1}
              </span>
            </div>

            {row.map((_, ci) => (
              <div
                key={ci}
                className="border-l border-slate-100 focus-within:bg-white focus-within:ring-1 focus-within:ring-primaryColor/20 transition-colors"
              >
                <input
                  className={INPUT_CLS}
                  placeholder={
                    isOriginal
                      ? `${t('cellPlaceholder')} ${ri + 1}–${ci + 1}`
                      : te('englishPlaceholder')
                  }
                  value={
                    isOriginal
                      ? (block.rows[ri]?.[ci] ?? '')
                      : (rowsEn[ri]?.[ci] ?? '')
                  }
                  onChange={(e) =>
                    isOriginal
                      ? updateCell(ri, ci, e.target.value)
                      : updateCellEn(ri, ci, e.target.value)
                  }
                />
              </div>
            ))}

            {/* remove row */}
            <div className="border-l border-slate-100 flex items-center justify-center">
              {isOriginal && (
                <button
                  type="button"
                  title={t('removeRow')}
                  disabled={block.rows.length <= 1}
                  onClick={() => removeRow(ri)}
                  className="flex items-center justify-center w-5 h-5 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 disabled:opacity-0 disabled:pointer-events-none opacity-0 group-hover/row:opacity-100 transition-all"
                >
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Add row — full-width strip at the bottom */}
        {isOriginal && (
          <button
            type="button"
            onClick={addRow}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-slate-400 hover:text-primaryColor hover:bg-primaryColor/4 border-t border-slate-100 transition-colors group/addrow"
          >
            <svg
              className="w-3.5 h-3.5 transition-transform group-hover/addrow:scale-110"
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
            {t('addRow')}
          </button>
        )}
      </div>

      {/* Stats badge */}
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-500">
          {block.rows.length} {t('rowsCount')} · {colCount} {t('colsCount')}
        </span>
      </div>

      {/* Caption */}
      <input
        className={CAPTION_CLS}
        placeholder={
          isOriginal ? t('captionPlaceholder') : te('englishPlaceholder')
        }
        value={isOriginal ? (block.caption ?? '') : (block.captionEn ?? '')}
        onChange={(e) =>
          isOriginal
            ? onChange({ ...block, caption: e.target.value || undefined })
            : onChange({ ...block, captionEn: e.target.value || undefined })
        }
      />
    </div>
  );
}
