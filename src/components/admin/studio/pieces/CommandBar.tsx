'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { AlertCircle, Loader2 } from 'lucide-react';
import type { ActiveRunDTO } from '@/lib/studio/piece-dto';
import { runErrorText } from './errorText';
import { useWorkspace } from './workspace-context';

/** What the worker is doing right now, in words. */
export function useRunLabel(
  run: ActiveRunDTO | null,
  outlineLength: number
): string | null {
  const t = useTranslations('admin.studio.run');
  if (!run) return null;
  if (run.status === 'queued') return t('queued');
  if (run.kind === 'write') {
    if (run.steps.some((s) => s.key === 'finish' && s.status === 'running'))
      return t('finishing');
    const sections = run.steps.filter((s) => s.key.startsWith('section:'));
    const running = sections.findIndex((s) => s.status === 'running');
    const n = running === -1 ? Math.max(sections.length, 1) : running + 1;
    return t('writing', { n, total: run.targets ?? outlineLength });
  }
  if (
    run.kind === 'outline' ||
    run.kind === 'translate' ||
    run.kind === 'rewrite_section'
  )
    return t(run.kind);
  return t('working');
}

/**
 * The workspace's one place for "what happens next": the step's actions on
 * the right, and on the left whatever the editor needs to know — the run in
 * progress, why the next action is not available, or what just went wrong.
 * It floats over the content like the posts dashboard's bulk bar.
 */
export default function CommandBar({
  hint,
  children,
}: {
  /** Why the main action is unavailable, or what it will do. */
  hint?: ReactNode;
  children?: ReactNode;
}) {
  const t = useTranslations('admin.studio');
  const { piece, busy, notice, notify, cancel } = useWorkspace();
  const runLabel = useRunLabel(piece.activeRun, piece.outline.length);
  const runError =
    !busy && piece.lastRunError ? runErrorText(t, piece.lastRunError) : null;

  let status: ReactNode = hint ? (
    <span className="text-slate-300">{hint}</span>
  ) : null;
  if (runError)
    status = (
      <span className="flex items-center gap-2 text-red-300">
        <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
        {t('workspace.failed', { error: runError })}
      </span>
    );
  if (busy)
    status = (
      <span className="flex items-center gap-2.5 text-white" aria-live="polite">
        <Loader2
          className="h-4 w-4 shrink-0 animate-spin text-primaryLight"
          aria-hidden
        />
        {runLabel}
      </span>
    );

  // An action's outcome wins over progress: a failed Cancel must be seen.
  if (notice)
    status = (
      <span role="alert" className="flex items-center gap-2 text-red-300">
        <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
        {notice}
        <button
          type="button"
          onClick={() => notify(null)}
          className="ml-1 text-xs text-slate-400 underline hover:text-white"
        >
          {t('bar.dismiss')}
        </button>
      </span>
    );
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-40 flex justify-center px-4 lg:left-56">
      <div className="animate-bulkbar pointer-events-auto flex w-full max-w-4xl flex-wrap items-center gap-3 rounded-2xl bg-slate-900 py-2.5 pl-5 pr-2.5 shadow-2xl ring-1 ring-black/10">
        <div className="min-w-0 flex-1 text-sm">{status}</div>
        <div className="flex shrink-0 items-center gap-2 [&_button]:ring-0">
          {busy ? (
            <button
              type="button"
              onClick={() => void cancel()}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-300 hover:bg-white/10 hover:text-white"
            >
              {t('workspace.cancel')}
            </button>
          ) : (
            children
          )}
        </div>
      </div>
    </div>
  );
}

/** A secondary action styled for the dark bar. */
export function BarButton({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:text-slate-500 disabled:hover:bg-transparent"
      {...props}
    >
      {children}
    </button>
  );
}

/** The step's main action. Unavailable reads clearly as unavailable on the dark bar. */
export function BarPrimary({
  busy,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { busy?: boolean }) {
  return (
    <button
      type="button"
      {...props}
      className="inline-flex items-center gap-2 rounded-lg bg-primaryColor px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primaryHover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
      disabled={busy || props.disabled}
    >
      {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}
