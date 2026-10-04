import { Marked, type Tokens } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js/lib/common';

export interface TocEntry {
  depth: number;
  text: string;
  id: string;
}

export interface RenderResult {
  html: string;
  toc: TocEntry[];
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/<[^>]*>/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-');
}

export function render(markdown: string): RenderResult {
  const toc: TocEntry[] = [];
  const seen = new Map<string, number>();

  const marked = new Marked({
    gfm: true,
    breaks: false,
    renderer: {
      heading(this: { parser: { parseInline(t: Tokens.Heading['tokens']): string } }, { tokens, depth, text }: Tokens.Heading) {
        const inner = this.parser.parseInline(tokens);
        const base = slugify(text) || 'section';
        const n = seen.get(base) ?? 0;
        seen.set(base, n + 1);
        // Prefixed like GitHub so ids can't clobber DOM properties (DOMPurify strips those).
        const id = `user-content-${n ? `${base}-${n}` : base}`;
        toc.push({ depth, text: inner.replace(/<[^>]*>/g, ''), id });
        return `<h${depth} id="${id}"><a class="anchor" href="#${id}" aria-hidden="true">#</a>${inner}</h${depth}>\n`;
      },
      code({ text, lang }: Tokens.Code) {
        const language = (lang ?? '').trim().split(/\s+/)[0];
        let body: string;
        if (language && hljs.getLanguage(language)) {
          body = hljs.highlight(text, { language, ignoreIllegals: true }).value;
        } else {
          body = escapeHtml(text);
        }
        const label = language ? `<span class="code-lang">${escapeHtml(language)}</span>` : '';
        return `<div class="code-block">${label}<button class="copy-btn" type="button">Copy</button><pre><code class="hljs${language ? ` language-${escapeHtml(language)}` : ''}">${body}</code></pre></div>\n`;
      },
    },
  });

  const raw = marked.parse(markdown, { async: false });
  const html = DOMPurify.sanitize(raw, { ADD_ATTR: ['target'] });
  return { html, toc };
}
