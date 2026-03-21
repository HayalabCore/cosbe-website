import type { ElementType } from 'react';
import Image from 'next/image';
import { imageSrcOrFallback } from '@/lib/article-utils';
import { paragraphContentToHtml } from '@/lib/sanitize-article-html';
import {
  ContentBlock,
  HeadingBlock,
  ParagraphBlock,
  ListBlock,
  QuoteBlock,
  CalloutBlock,
  ImageBlock,
  CodeBlock,
  EmbedBlock,
} from '@/types';

export default function BlockRenderer({ block }: { block: ContentBlock }) {
  switch (block.type) {
    case 'heading': {
      const heading = block as HeadingBlock;
      const headingTags: Record<number, ElementType> = {
        1: 'h1',
        2: 'h2',
        3: 'h3',
        4: 'h4',
      };
      const Tag = headingTags[heading.level] ?? 'h2';
      const styles: Record<number, string> = {
        2: 'text-xl md:text-2xl font-bold text-textPrimary mt-12 mb-5 pb-3 border-b-2 border-primaryColor/20 scroll-mt-32',
        3: 'text-lg md:text-xl font-bold text-textPrimary mt-10 mb-4 scroll-mt-32',
        4: 'text-base md:text-lg font-semibold text-textPrimary mt-8 mb-3 scroll-mt-32',
      };
      return (
        <Tag id={block.id} className={styles[heading.level] || styles[2]}>
          {heading.content}
        </Tag>
      );
    }

    case 'paragraph': {
      const paragraph = block as ParagraphBlock;
      const html = paragraphContentToHtml(paragraph.content);
      if (!html) {
        return null;
      }
      return (
        <div
          className="text-gray-700 leading-[1.9] mb-5 text-[15px] prose prose-sm max-w-none prose-p:mb-3 prose-p:last:mb-0 prose-a:text-primaryColor prose-strong:text-gray-900 prose-ul:my-3 prose-ol:my-3 prose-li:my-1 prose-blockquote:border-l-4 prose-blockquote:border-primaryColor/25 prose-blockquote:bg-gray-50/80 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:italic prose-hr:my-8 prose-hr:border-gray-200 prose-mark:px-0.5 prose-mark:rounded-sm [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-3 [&_li]:my-1 [&_li>p]:my-0 [&_li>p:last-child]:mb-0 [&_li::marker]:text-slate-500 [&_blockquote]:border-l-4 [&_blockquote]:border-primaryColor/30 [&_blockquote]:bg-gray-50/60 [&_blockquote]:py-2 [&_blockquote]:px-4 [&_blockquote]:italic [&_blockquote]:text-gray-600 [&_mark]:rounded-sm [&_mark]:px-0.5"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    }

    case 'list': {
      const list = block as ListBlock;
      const ListTag = list.listType === 'numbered' ? 'ol' : 'ul';
      return (
        <ListTag
          className={`mb-6 space-y-3 ${list.listType === 'numbered' ? 'list-decimal' : 'list-none'} pl-0`}
        >
          {list.items.map((item, index) => (
            <li
              key={index}
              className={`
                text-gray-700 leading-relaxed text-[15px] pl-6 relative
                ${list.listType !== 'numbered' ? "before:content-['•'] before:absolute before:left-0 before:text-primaryColor before:font-bold" : ''}
              `}
            >
              {item}
            </li>
          ))}
        </ListTag>
      );
    }

    case 'quote': {
      const quote = block as QuoteBlock;
      return (
        <blockquote className="border-l-4 border-primaryColor/40 pl-5 py-4 my-8 bg-gradient-to-r from-gray-50 to-transparent rounded-r-lg">
          <p className="text-gray-600 italic text-[15px] leading-relaxed">{quote.content}</p>
          {quote.citation && (
            <cite className="text-sm text-textTertiary mt-3 block not-italic font-medium">
              — {quote.citation}
            </cite>
          )}
        </blockquote>
      );
    }

    case 'callout': {
      const callout = block as CalloutBlock;
      const variantStyles: Record<string, { bg: string; border: string; icon: string }> = {
        info: { bg: 'bg-blue-50', border: 'border-blue-400', icon: 'ℹ️' },
        warning: { bg: 'bg-amber-50', border: 'border-amber-400', icon: '⚠️' },
        tip: { bg: 'bg-emerald-50', border: 'border-emerald-400', icon: '💡' },
        related: { bg: 'bg-gray-50', border: 'border-gray-300', icon: '📎' },
      };
      const style = variantStyles[callout.variant] || variantStyles.info;
      return (
        <div className={`${style.bg} border-l-4 ${style.border} p-5 my-8 rounded-r-xl`}>
          {callout.title && (
            <p className="font-bold mb-2 text-textPrimary flex items-center gap-2">
              <span>{style.icon}</span>
              {callout.title}
            </p>
          )}
          <p className="text-gray-700 text-[15px] leading-relaxed whitespace-pre-wrap">
            {callout.content}
          </p>
        </div>
      );
    }

    case 'image': {
      const image = block as ImageBlock;
      const src = imageSrcOrFallback(image.url, '');
      if (!src) return null;
      return (
        <figure className="my-8">
          <div className="relative aspect-video rounded-xl overflow-hidden shadow-md">
            <Image
              src={src}
              alt={image.alt}
              fill
              sizes="(max-width: 768px) 100vw, 700px"
              className="object-cover"
            />
          </div>
          {image.caption && (
            <figcaption className="text-sm text-textTertiary text-center mt-3 italic">
              {image.caption}
            </figcaption>
          )}
        </figure>
      );
    }

    case 'code': {
      const code = block as CodeBlock;
      return (
        <pre className="my-6 p-4 rounded-xl bg-gray-900 text-gray-100 text-sm overflow-x-auto border border-gray-700">
          {code.language && (
            <span className="block text-xs text-gray-400 mb-2 font-sans">{code.language}</span>
          )}
          <code className="font-mono whitespace-pre">{code.code}</code>
        </pre>
      );
    }

    case 'divider':
      return <hr className="my-10 border-t border-gray-200" />;

    case 'embed': {
      const embed = block as EmbedBlock;
      if (embed.embedType === 'youtube' && embed.url) {
        const id = extractYoutubeId(embed.url);
        if (!id) {
          return (
            <p className="my-6 text-sm text-textTertiary">
              <a href={embed.url} className="text-primaryColor underline" target="_blank" rel="noreferrer">
                {embed.title || embed.url}
              </a>
            </p>
          );
        }
        return (
          <div className="my-8 aspect-video rounded-xl overflow-hidden shadow-md">
            <iframe
              title={embed.title || 'Video'}
              className="h-full w-full"
              src={`https://www.youtube-nocookie.com/embed/${id}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        );
      }
      return (
        <p className="my-6">
          <a
            href={embed.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primaryColor font-medium hover:underline"
          >
            {embed.title || embed.url}
          </a>
        </p>
      );
    }

    default:
      return null;
  }
}

function extractYoutubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) {
      return u.pathname.slice(1) || null;
    }
    if (u.hostname.includes('youtube.com')) {
      return u.searchParams.get('v');
    }
  } catch {
    return null;
  }
  return null;
}
