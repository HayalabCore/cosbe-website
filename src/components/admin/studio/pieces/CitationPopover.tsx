'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { getChunksAction } from '@/actions/studio-pieces';

type Chunk = { id: string; sourceTitle: string; text: string; locator: Record<string, unknown> };

export default function CitationPopover({ ids, index }: { ids: string[]; index: number }) {
  const t = useTranslations('admin.studio.review');
  const [open, setOpen] = useState(false);
  const [chunks, setChunks] = useState<Chunk[] | null>(null);

  async function toggle() {
    setOpen((o) => !o);
    if (!chunks) {
      const result = await getChunksAction(ids);
      if (result.ok) setChunks(result.data);
    }
  }

  return (
    <span className="relative">
      <button type="button" aria-label={`${t('citation')} ${index}`} onClick={() => void toggle()} className="ml-0.5 align-super text-[10px] text-blue-700">
        [{index}]
      </button>
      {open && chunks && (
        <span className="absolute left-0 top-5 z-10 block w-80 space-y-2 rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-700 shadow-lg">
          {chunks.map((c) => (
            <span key={c.id} className="block">
              <span className="block font-medium text-slate-900">{c.sourceTitle}</span>
              {c.text}
            </span>
          ))}
        </span>
      )}
    </span>
  );
}
