import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderAdmin } from '@/test/render-admin';
import type {
  CalloutBlock,
  CodeBlock,
  EmbedBlock,
  HeadingBlock,
  ImageBlock,
  ListBlock,
  QuoteBlock,
  TableBlock,
} from '@/types';

vi.mock('@/actions/block-translation', () => ({
  translateBlockEnAction: vi.fn(),
  translateArticleMetaEnAction: vi.fn(),
  translateArticleEnAction: vi.fn(),
}));

vi.mock('next/image', () => ({
  default: (props: { alt?: string; src?: string }) => (
    <img
      alt={props.alt ?? ''}
      src={typeof props.src === 'string' ? props.src : ''}
    />
  ),
}));

import HeadingBlockEditor from './HeadingBlockEditor';
import ParagraphBlockEditor from './ParagraphBlockEditor';
import ListBlockEditor from './ListBlockEditor';
import QuoteBlockEditor from './QuoteBlockEditor';
import CalloutBlockEditor from './CalloutBlockEditor';
import ImageBlockEditor from './ImageBlockEditor';
import CodeBlockEditor from './CodeBlockEditor';
import DividerBlockEditor from './DividerBlockEditor';
import EmbedBlockEditor from './EmbedBlockEditor';
import TableBlockEditor from './TableBlockEditor';

describe('block editors', () => {
  it('heading emits onChange', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const block: HeadingBlock = {
      id: 'h1',
      type: 'heading',
      level: 2,
      content: '',
    };
    renderAdmin(<HeadingBlockEditor block={block} onChange={onChange} />);
    await user.type(screen.getByPlaceholderText('Heading text…'), 'Hi');
    expect(onChange).toHaveBeenCalled();
  });

  it('paragraph mounts locale tabs (TipTap is not driven in jsdom)', () => {
    renderAdmin(
      <ParagraphBlockEditor
        block={{ id: 'p1', type: 'paragraph', content: '<p>Hi</p>' }}
        onChange={vi.fn()}
      />
    );
    expect(
      screen.getByRole('button', { name: 'Japanese' })
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'English' })).toBeInTheDocument();
  });

  it('list emits onChange', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const block: ListBlock = {
      id: 'l1',
      type: 'list',
      listType: 'bullet',
      items: [''],
    };
    renderAdmin(<ListBlockEditor block={block} onChange={onChange} />);
    await user.type(screen.getByPlaceholderText('Item 1'), 'one');
    expect(onChange).toHaveBeenCalled();
  });

  it('quote emits onChange', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const block: QuoteBlock = { id: 'q1', type: 'quote', content: '' };
    renderAdmin(<QuoteBlockEditor block={block} onChange={onChange} />);
    await user.type(screen.getByPlaceholderText('Quote text…'), 'said');
    expect(onChange).toHaveBeenCalled();
  });

  it('callout emits onChange', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const block: CalloutBlock = {
      id: 'c1',
      type: 'callout',
      variant: 'info',
      content: '',
    };
    renderAdmin(<CalloutBlockEditor block={block} onChange={onChange} />);
    await user.type(screen.getByPlaceholderText('Callout content…'), 'note');
    expect(onChange).toHaveBeenCalled();
  });

  it('image emits onChange', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const block: ImageBlock = {
      id: 'i1',
      type: 'image',
      url: '',
      alt: '',
    };
    renderAdmin(<ImageBlockEditor block={block} onChange={onChange} />);
    await user.type(
      screen.getByPlaceholderText('Or paste image URL'),
      'https://cdn.example/a.png'
    );
    expect(onChange).toHaveBeenCalled();
  });

  it('code emits onChange', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const block: CodeBlock = {
      id: 'k1',
      type: 'code',
      language: 'javascript',
      code: '',
    };
    renderAdmin(<CodeBlockEditor block={block} onChange={onChange} />);
    await user.type(screen.getByPlaceholderText('// Your code here…'), 'x');
    expect(onChange).toHaveBeenCalled();
  });

  it('divider renders its label', () => {
    renderAdmin(<DividerBlockEditor />);
    expect(screen.getByText('Horizontal divider')).toBeInTheDocument();
  });

  it('embed emits onChange', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const block: EmbedBlock = {
      id: 'e1',
      type: 'embed',
      embedType: 'youtube',
      url: '',
    };
    renderAdmin(<EmbedBlockEditor block={block} onChange={onChange} />);
    await user.type(
      screen.getByPlaceholderText('Paste URL…'),
      'https://youtu.be/x'
    );
    expect(onChange).toHaveBeenCalled();
  });

  it('table emits onChange', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const block: TableBlock = {
      id: 't1',
      type: 'table',
      headers: ['A'],
      rows: [['']],
    };
    renderAdmin(<TableBlockEditor block={block} onChange={onChange} />);
    const title = screen.getByPlaceholderText('Table title (optional)');
    await user.type(title, 'Grid');
    expect(onChange).toHaveBeenCalled();
  });
});
