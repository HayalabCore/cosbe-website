'use client';

import { useTranslations } from 'next-intl';
import { ArchiveRestore } from 'lucide-react';
import { restorePieceAction } from '@/actions/studio-pieces';
import { Banner, Button } from '../ui';
import { useStudioAction } from './useStudioAction';
import { useWorkspace } from './workspace-context';

/** An archived piece is read-only until it is restored. */
export default function ArchivedBanner() {
  const t = useTranslations('admin.studio.archive');
  const { piece, refresh, notify } = useWorkspace();
  const { run, pending } = useStudioAction(refresh, notify);
  return (
    <Banner
      tone="info"
      title={t('bannerTitle')}
      action={
        <Button
          size="sm"
          busy={pending}
          icon={<ArchiveRestore className="h-3.5 w-3.5" aria-hidden />}
          onClick={() => void run(() => restorePieceAction(piece.id))}
        >
          {t('restore')}
        </Button>
      }
    />
  );
}
