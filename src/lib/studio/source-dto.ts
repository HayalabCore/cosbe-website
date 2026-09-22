import type { SourceListItem } from '@/generator/sources/sources-repository';
import type {
  SourceKind,
  SourceStatus,
} from '@/generator/sources/source-types';

export type SourceDTO = {
  id: string;
  kind: SourceKind;
  status: SourceStatus;
  error: string | null;
  title: string;
  language: string | null;
  charCount: number;
  projectCount: number;
  chunkCount: number;
  createdAt: string;
};

export function toSourceDTO(s: SourceListItem): SourceDTO {
  return {
    id: s.id,
    kind: s.kind as SourceKind,
    status: s.status as SourceStatus,
    error: s.error,
    title: s.title,
    language: s.language,
    charCount: s.charCount,
    projectCount: s._count.projects,
    chunkCount: s._count.chunks,
    createdAt: s.createdAt.toISOString(),
  };
}
