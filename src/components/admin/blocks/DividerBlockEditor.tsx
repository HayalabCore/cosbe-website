'use client';

export default function DividerBlockEditor() {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="flex-1 border-t border-dashed border-slate-300" />
      <span className="text-xs text-slate-400 font-medium">Horizontal divider</span>
      <div className="flex-1 border-t border-dashed border-slate-300" />
    </div>
  );
}
