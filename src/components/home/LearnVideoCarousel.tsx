'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Link } from '@/i18n/routing';

export type LearnVideo = {
  id: string;
  title: string;
  href: string;
  thumbnail: string;
  youtubeId: string;
};

type Props = {
  videos: LearnVideo[];
  labels: { previous: string; next: string; play: string };
};

const pagerCls =
  'flex h-[31px] w-[45px] items-center justify-center border border-textDark bg-white transition-colors hover:bg-bgSoft disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-white';

export default function LearnVideoCarousel({ videos, labels }: Props) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const video = videos[index];
  if (!video) return null;

  const go = (next: number) => {
    setIndex(next);
    setPlaying(false);
  };

  return (
    <div>
      <div className="relative aspect-[756/425] w-full overflow-hidden bg-textDark">
        {playing ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}?autoplay=1`}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 size-full"
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            aria-label={`${labels.play}: ${video.title}`}
            className="group absolute inset-0"
          >
            <Image
              src={video.thumbnail}
              alt=""
              fill
              sizes="(max-width: 1024px) 100vw, 756px"
              className="object-cover"
            />
            <span className="absolute left-1/2 top-1/2 flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
              <span className="ml-1 border-y-[12px] border-l-[20px] border-y-transparent border-l-white" />
            </span>
          </button>
        )}
      </div>

      <div className="mt-[21px] flex items-start justify-between gap-6">
        <Link
          href={video.href}
          className="line-clamp-3 max-w-[560px] text-base font-medium leading-6 hover:text-primaryColor sm:text-xl"
        >
          {video.title}
        </Link>
        {videos.length > 1 && (
          <div className="mt-2 flex shrink-0 gap-[6px]">
            <button
              type="button"
              className={pagerCls}
              onClick={() => go(index - 1)}
              disabled={index === 0}
              aria-label={labels.previous}
            >
              <Image
                src="/home/top/pager-prev.png"
                alt=""
                width={10}
                height={16}
              />
            </button>
            <button
              type="button"
              className={pagerCls}
              onClick={() => go(index + 1)}
              disabled={index === videos.length - 1}
              aria-label={labels.next}
            >
              <Image
                src="/home/top/pager-next.png"
                alt=""
                width={10}
                height={16}
              />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
