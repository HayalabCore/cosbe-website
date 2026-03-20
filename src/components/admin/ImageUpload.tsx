'use client';

import { useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { uploadImage } from '@/lib/storage';

type Props = {
  supabase: SupabaseClient;
  articleId: string;
  label?: string;
  onUploaded: (url: string) => void;
};

export default function ImageUpload({ supabase, articleId, label = 'Upload image', onUploaded }: Props) {
  const [uploading, setUploading] = useState(false);

  return (
    <label
      className={`inline-flex items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-sm font-medium cursor-pointer transition-colors ${
        uploading
          ? 'border-slate-200 text-slate-400 cursor-not-allowed'
          : 'border-slate-300 text-slate-600 hover:border-primaryColor hover:text-primaryColor hover:bg-primaryColor/5'
      }`}
    >
      <input
        type="file"
        accept="image/*"
        disabled={uploading}
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setUploading(true);
          try {
            const url = await uploadImage(supabase, file, articleId);
            onUploaded(url);
          } catch (err) {
            console.error(err);
            alert(err instanceof Error ? err.message : 'Upload failed');
          } finally {
            setUploading(false);
          }
          e.target.value = '';
        }}
      />
      {uploading ? (
        <>
          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Uploading…
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          {label}
        </>
      )}
    </label>
  );
}
