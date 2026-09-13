import type { ReactNode } from 'react';

function Pulse({ className }: { className: string }) {
  return <div className={`bg-slate-200 rounded ${className}`} />;
}

function Status({
  children,
  'aria-label': ariaLabel,
  className = '',
}: {
  children: ReactNode;
  'aria-label'?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={ariaLabel}
      className={`animate-pulse ${className}`}
    >
      {children}
    </div>
  );
}

export function AdminPageHeaderSkeleton({
  'aria-label': ariaLabel,
}: {
  'aria-label'?: string;
}) {
  return (
    <Status aria-label={ariaLabel} className="mb-6 flex items-center gap-4">
      <div className="flex-1 space-y-2">
        <Pulse className="h-7 w-40" />
        <Pulse className="h-4 w-64 bg-slate-100" />
      </div>
      <Pulse className="h-9 w-28 rounded-lg" />
    </Status>
  );
}

export function AdminTableSkeleton({
  rows = 8,
  columns = 6,
  'aria-label': ariaLabel,
}: {
  rows?: number;
  columns?: number;
  'aria-label'?: string;
}) {
  const n = Math.max(1, Math.min(rows, 24));
  return (
    <Status
      aria-label={ariaLabel}
      className="overflow-hidden rounded-xl border border-slate-200 bg-white"
    >
      <div className="border-b border-slate-100 bg-slate-50 px-4 py-3 flex gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Pulse key={i} className="h-3 w-16" />
        ))}
      </div>
      <div className="divide-y divide-slate-100">
        {Array.from({ length: n }).map((_, i) => (
          <div key={i} className="px-4 py-3.5 flex gap-4">
            <Pulse className="h-4 w-[28%]" />
            <Pulse className="h-4 w-[18%] bg-slate-100" />
            <Pulse className="h-4 w-[14%] bg-slate-100" />
            <Pulse className="h-4 w-[16%] bg-slate-100" />
          </div>
        ))}
      </div>
    </Status>
  );
}

export function AdminCardGridSkeleton({
  cards = 4,
  'aria-label': ariaLabel,
}: {
  cards?: number;
  'aria-label'?: string;
}) {
  return (
    <Status
      aria-label={ariaLabel}
      className="grid gap-3 md:grid-cols-2"
    >
      {Array.from({ length: cards }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-slate-200 bg-white p-4 space-y-3"
        >
          <Pulse className="h-5 w-32" />
          <Pulse className="h-3 w-20 bg-slate-100" />
          <Pulse className="h-4 w-full bg-slate-100" />
          <Pulse className="h-3 w-40 bg-slate-100" />
        </div>
      ))}
    </Status>
  );
}

export function AdminMediaGridSkeleton({
  tiles = 8,
  'aria-label': ariaLabel,
}: {
  tiles?: number;
  'aria-label'?: string;
}) {
  return (
    <Status
      aria-label={ariaLabel}
      className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"
    >
      {Array.from({ length: tiles }).map((_, i) => (
        <div
          key={i}
          className="aspect-square rounded-xl border border-slate-200 bg-slate-100"
        />
      ))}
    </Status>
  );
}

export function AdminEditorSkeleton({
  'aria-label': ariaLabel,
}: {
  'aria-label'?: string;
}) {
  return (
    <Status aria-label={ariaLabel} className="flex flex-col min-h-screen">
      <div className="h-14 border-b border-slate-200 bg-white px-4 flex items-center justify-between gap-3">
        <Pulse className="h-5 w-48" />
        <div className="flex gap-2">
          <Pulse className="h-8 w-20 rounded-lg" />
          <Pulse className="h-8 w-24 rounded-lg" />
        </div>
      </div>
      <div className="grid gap-6 p-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-4">
          <Pulse className="h-10 w-3/4" />
          <Pulse className="h-64 w-full rounded-xl bg-slate-100" />
        </div>
        <div className="space-y-3">
          <Pulse className="h-24 w-full rounded-xl bg-slate-100" />
          <Pulse className="h-24 w-full rounded-xl bg-slate-100" />
          <Pulse className="h-24 w-full rounded-xl bg-slate-100" />
        </div>
      </div>
    </Status>
  );
}

export function AdminFormSkeleton({
  'aria-label': ariaLabel,
}: {
  'aria-label'?: string;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 py-12">
      <Status aria-label={ariaLabel} className="w-full max-w-sm space-y-4">
        <Pulse className="h-8 w-48" />
        <Pulse className="h-4 w-64 bg-slate-100" />
        <Pulse className="h-12 w-full rounded-xl" />
        <Pulse className="h-12 w-full rounded-xl" />
        <Pulse className="h-12 w-full rounded-xl" />
        <Pulse className="h-12 w-full rounded-xl" />
      </Status>
    </div>
  );
}

export function AdminTranslationsSkeleton({
  rows = 5,
  showChrome = true,
  'aria-label': ariaLabel,
}: {
  rows?: number;
  showChrome?: boolean;
  'aria-label'?: string;
}) {
  return (
    <Status aria-label={ariaLabel} className="space-y-4">
      {showChrome && (
        <>
          <Pulse className="h-10 w-72 rounded-lg" />
          <div className="flex gap-2">
            <Pulse className="h-7 w-20 rounded-md" />
            <Pulse className="h-7 w-24 rounded-md" />
            <Pulse className="h-7 w-16 rounded-md" />
          </div>
        </>
      )}
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-slate-200 bg-white p-4 space-y-3"
        >
          <Pulse className="h-3 w-40" />
          <Pulse className="h-16 w-full rounded-lg bg-slate-100" />
        </div>
      ))}
    </Status>
  );
}

export function AdminImportSkeleton({
  'aria-label': ariaLabel,
}: {
  'aria-label'?: string;
}) {
  return (
    <Status aria-label={ariaLabel} className="space-y-6">
      <div className="space-y-2">
        <Pulse className="h-6 w-32" />
        <Pulse className="h-4 w-72 bg-slate-100" />
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
        <Pulse className="h-5 w-40" />
        <Pulse className="h-40 w-full rounded-lg bg-slate-100" />
        <Pulse className="h-9 w-28 rounded-lg" />
      </div>
    </Status>
  );
}
