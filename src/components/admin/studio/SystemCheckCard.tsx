'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { getRunStatusAction, startSystemCheckAction } from '@/actions/studio';
import type { RunStatusDTO } from '@/lib/studio/action-types';

const POLL_MS = 2000;
const MAX_POLLS = 45;

type State =
  | { phase: 'idle' }
  | { phase: 'waiting'; status: 'queued' | 'running' }
  | { phase: 'succeeded'; worker: string; seconds: number }
  | { phase: 'failed'; error: string }
  | { phase: 'timeout' }
  | { phase: 'start-error' };

function succeededState(run: RunStatusDTO): State {
  const output = run.steps[0]?.output as { worker?: string } | undefined;
  const end = run.finishedAt ? Date.parse(run.finishedAt) : Date.now();
  return {
    phase: 'succeeded',
    worker: output?.worker ?? '?',
    seconds: Math.max(0, Math.round((end - Date.parse(run.createdAt)) / 1000)),
  };
}

export default function SystemCheckCard() {
  const t = useTranslations('admin.studio.systemCheck');
  const [state, setState] = useState<State>({ phase: 'idle' });
  const timer = useRef<number | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, []);

  function poll(runId: string, count: number) {
    timer.current = window.setTimeout(async () => {
      let result: Awaited<ReturnType<typeof getRunStatusAction>>;
      try {
        result = await getRunStatusAction(runId);
      } catch {
        result = { ok: false, error: 'FAILED' };
      }
      if (!mounted.current) return;
      if (!result.ok) {
        setState({ phase: 'failed', error: result.error });
        return;
      }
      const run = result.data;
      if (run.status === 'succeeded') {
        setState(succeededState(run));
      } else if (run.status === 'failed' || run.status === 'cancelled') {
        setState({ phase: 'failed', error: run.error ?? run.status });
      } else if (count + 1 >= MAX_POLLS) {
        setState({ phase: 'timeout' });
      } else {
        setState({ phase: 'waiting', status: run.status });
        poll(runId, count + 1);
      }
    }, POLL_MS);
  }

  async function start() {
    setState({ phase: 'waiting', status: 'queued' });
    let result: Awaited<ReturnType<typeof startSystemCheckAction>>;
    try {
      result = await startSystemCheckAction();
    } catch {
      result = { ok: false, error: 'FAILED' };
    }
    if (!mounted.current) return;
    if (!result.ok) {
      setState({ phase: 'start-error' });
      return;
    }
    poll(result.data.runId, 0);
  }

  const busy = state.phase === 'waiting';

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="text-base font-semibold text-slate-900">{t('title')}</h2>
      <p className="mt-1 text-sm text-slate-500">{t('description')}</p>
      <button
        type="button"
        onClick={() => void start()}
        disabled={busy}
        className="mt-4 rounded-lg bg-primaryColor px-4 py-2 text-sm font-semibold text-white hover:bg-primaryHover disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {t('run')}
      </button>
      <p className="mt-3 text-sm text-slate-700" aria-live="polite">
        {state.phase === 'waiting' && t(state.status)}
        {state.phase === 'succeeded' &&
          t('succeeded', { worker: state.worker, seconds: state.seconds })}
        {state.phase === 'failed' && t('failed', { error: state.error })}
        {state.phase === 'timeout' && t('timeout')}
        {state.phase === 'start-error' && t('startError')}
      </p>
    </section>
  );
}
