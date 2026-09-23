'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

/** Keywords as chips: Enter, comma or 、 adds one; Backspace on empty removes the last. */
export default function KeywordInput({
  id,
  value,
  onChange,
  disabled,
  placeholder,
  removeLabel,
  ...aria
}: {
  id?: string;
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
  removeLabel: (keyword: string) => string;
  'aria-describedby'?: string;
}) {
  const [draft, setDraft] = useState('');

  function commit(text: string) {
    const parts = text
      .split(/[,、，]/)
      .map((k) => k.trim())
      .filter(Boolean);
    if (parts.length === 0) return;
    onChange([...value, ...parts.filter((k) => !value.includes(k))]);
    setDraft('');
  }

  return (
    <div
      className={`flex min-h-[38px] flex-wrap items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1.5 shadow-sm focus-within:border-primaryColor focus-within:ring-2 focus-within:ring-primaryColor/15 ${disabled ? 'bg-slate-50' : ''}`}
    >
      {value.map((k) => (
        <span
          key={k}
          className="inline-flex items-center gap-1 rounded-md bg-slate-100 py-0.5 pl-2 pr-1 text-xs font-medium text-slate-700"
        >
          {k}
          {!disabled && (
            <button
              type="button"
              aria-label={removeLabel(k)}
              onClick={() => onChange(value.filter((x) => x !== k))}
              className="rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
            >
              <X className="h-3 w-3" aria-hidden />
            </button>
          )}
        </span>
      ))}
      <input
        id={id}
        {...aria}
        value={draft}
        disabled={disabled}
        placeholder={value.length === 0 ? placeholder : undefined}
        onChange={(e) => {
          const text = e.target.value;
          if (/[,、，]$/.test(text)) commit(text);
          else setDraft(text);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
            e.preventDefault();
            commit(draft);
          } else if (e.key === 'Backspace' && !draft && value.length > 0) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={() => commit(draft)}
        className="min-w-[8rem] flex-1 border-0 bg-transparent px-1 py-0.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
      />
    </div>
  );
}
