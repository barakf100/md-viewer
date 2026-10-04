import './style.css';
import { render, type TocEntry } from './render';
import sample from './sample.md?raw';

type View = 'edit' | 'split' | 'preview';
type Theme = 'light' | 'dark';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const editor = $<HTMLTextAreaElement>('editor');
const preview = $<HTMLElement>('preview');
const previewPane = $<HTMLElement>('preview-pane');
const workspace = $<HTMLElement>('workspace');
const tocEl = $<HTMLElement>('toc');
const filenameEl = $<HTMLElement>('filename');
const fileInput = $<HTMLInputElement>('file-input');
const statsEl = $<HTMLElement>('stats');
const statusEl = $<HTMLElement>('status');
const dropOverlay = $<HTMLElement>('drop-overlay');

// ---------- persistence (best effort; storage may be unavailable) ----------
const store = {
  get(key: string): string | null {
    try {
      return localStorage.getItem(`mdv:${key}`);
    } catch {
      return null;
    }
  },
  set(key: string, value: string) {
    try {
      localStorage.setItem(`mdv:${key}`, value);
    } catch {
      /* ignore */
    }
  },
};

let filename = store.get('filename') ?? 'welcome.md';
let lastToc: TocEntry[] = [];

// ---------- rendering ----------
let renderQueued = false;
function scheduleRender() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    renderNow();
  });
}

function renderNow() {
  const text = editor.value;
  const { html, toc } = render(text);
  preview.innerHTML = html;
  lastToc = toc;
  renderToc();
  updateStats(text);
  store.set('content', text);
}

function renderToc() {
  if (!lastToc.length) {
    tocEl.innerHTML = '<p class="toc-empty">No headings</p>';
    return;
  }
  const min = Math.min(...lastToc.map((t) => t.depth));
  tocEl.innerHTML =
    '<p class="toc-title">Outline</p>' +
    lastToc
      .map(
        (t) =>
          `<a href="#${t.id}" style="padding-left:${(t.depth - min) * 12 + 12}px">${escapeText(t.text)}</a>`,
      )
      .join('');
}

function escapeText(s: string) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function updateStats(text: string) {
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const lines = text ? text.split('\n').length : 0;
  const minutes = Math.max(1, Math.round(words / 230));
  statsEl.textContent = `${words.toLocaleString()} words · ${lines.toLocaleString()} lines · ${minutes} min read`;
}

let statusTimer = 0;
function flash(msg: string) {
  statusEl.textContent = msg;
  clearTimeout(statusTimer);
  statusTimer = window.setTimeout(() => (statusEl.textContent = ''), 2500);
}

// ---------- documents ----------
function setFilename(name: string) {
  filename = name;
  filenameEl.textContent = name;
  document.title = `${name} — MD Viewer`;
  store.set('filename', name);
}

function loadDocument(name: string, text: string) {
  setFilename(name);
  editor.value = text;
  editor.scrollTop = 0;
  previewPane.scrollTop = 0;
  renderNow();
}

async function openFile(file: File) {
  const text = await file.text();
  loadDocument(file.name, text);
  flash(`Opened ${file.name}`);
}

function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function saveMarkdown() {
  download(filename, editor.value, 'text/markdown;charset=utf-8');
  flash(`Downloaded ${filename}`);
}

function exportHtml() {
  const css = [...document.styleSheets]
    .map((sheet) => {
      try {
        return [...sheet.cssRules].map((r) => r.cssText).join('\n');
      } catch {
        return '';
      }
    })
    .join('\n');
  const title = filename.replace(/\.[^.]+$/, '');
  const theme = document.documentElement.dataset.theme ?? 'light';
  const doc = `<!doctype html>
<html lang="en" data-theme="${theme}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeText(title)}</title>
<style>${css}
body{display:block;height:auto;overflow:auto}
.export-wrap{max-width:860px;margin:0 auto;padding:40px 24px}
.copy-btn{display:none}
</style>
</head>
<body><div class="export-wrap"><article class="markdown-body">${preview.innerHTML}</article></div></body>
</html>`;
  download(`${title}.html`, doc, 'text/html;charset=utf-8');
  flash(`Exported ${title}.html`);
}

// ---------- view & theme ----------
function setView(view: View) {
  workspace.dataset.view = view;
  document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach((b) => {
    b.setAttribute('aria-pressed', String(b.dataset.view === view));
  });
  store.set('view', view);
  if (view !== 'preview') editor.focus();
}

function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  store.set('theme', theme);
}

function setTocVisible(visible: boolean) {
  workspace.classList.toggle('show-toc', visible);
  $('btn-toc').setAttribute('aria-pressed', String(visible));
  store.set('toc', visible ? '1' : '0');
}

// ---------- wiring ----------
editor.addEventListener('input', scheduleRender);

// Tab inserts two spaces instead of leaving the editor.
editor.addEventListener('keydown', (e) => {
  if (e.key === 'Tab' && !e.ctrlKey && !e.metaKey) {
    e.preventDefault();
    document.execCommand('insertText', false, '  ');
  }
});

// Proportional scroll sync: editor drives the preview in split view.
editor.addEventListener('scroll', () => {
  if (workspace.dataset.view !== 'split') return;
  const max = editor.scrollHeight - editor.clientHeight;
  const ratio = max > 0 ? editor.scrollTop / max : 0;
  previewPane.scrollTop = ratio * (previewPane.scrollHeight - previewPane.clientHeight);
});

preview.addEventListener('click', async (e) => {
  const target = e.target as HTMLElement;
  const copyBtn = target.closest<HTMLButtonElement>('.copy-btn');
  if (copyBtn) {
    const code = copyBtn.parentElement?.querySelector('code')?.textContent ?? '';
    try {
      await navigator.clipboard.writeText(code);
      copyBtn.textContent = 'Copied';
    } catch {
      copyBtn.textContent = 'Failed';
    }
    setTimeout(() => (copyBtn.textContent = 'Copy'), 1500);
    return;
  }
  const link = target.closest<HTMLAnchorElement>('a[href]');
  if (!link) return;
  const href = link.getAttribute('href')!;
  if (href.startsWith('#')) {
    e.preventDefault();
    scrollToId(decodeURIComponent(href.slice(1)));
  } else {
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
  }
});

function scrollToId(id: string) {
  const el =
    document.getElementById(id) ?? document.getElementById(`user-content-${id}`);
  el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

tocEl.addEventListener('click', (e) => {
  const link = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]');
  if (!link) return;
  e.preventDefault();
  if (workspace.dataset.view === 'edit') setView('split');
  scrollToId(link.getAttribute('href')!.slice(1));
});

$('btn-new').addEventListener('click', () => {
  if (editor.value.trim() && !confirm('Start a new document? Unsaved changes will be lost.')) return;
  loadDocument('untitled.md', '');
  setView(workspace.dataset.view === 'preview' ? 'split' : (workspace.dataset.view as View));
});
$('btn-open').addEventListener('click', () => fileInput.click());
$('btn-save').addEventListener('click', saveMarkdown);
$('btn-export').addEventListener('click', exportHtml);
$('btn-toc').addEventListener('click', () => setTocVisible(!workspace.classList.contains('show-toc')));
$('btn-theme').addEventListener('click', () =>
  setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'),
);
document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach((b) =>
  b.addEventListener('click', () => setView(b.dataset.view as View)),
);

fileInput.addEventListener('change', () => {
  const file = fileInput.files?.[0];
  if (file) openFile(file);
  fileInput.value = '';
});

filenameEl.addEventListener('click', () => {
  const name = prompt('File name', filename)?.trim();
  if (name) setFilename(/\.\w+$/.test(name) ? name : `${name}.md`);
});

document.addEventListener('keydown', (e) => {
  const mod = e.ctrlKey || e.metaKey;
  if (!mod) return;
  const key = e.key.toLowerCase();
  if (key === 's') {
    e.preventDefault();
    saveMarkdown();
  } else if (key === 'o') {
    e.preventDefault();
    fileInput.click();
  } else if (key === 'n' && e.altKey) {
    e.preventDefault();
    $('btn-new').click();
  } else if (e.altKey && ['1', '2', '3'].includes(key)) {
    e.preventDefault();
    setView((['edit', 'split', 'preview'] as const)[Number(key) - 1]);
  }
});

// Drag & drop
let dragDepth = 0;
window.addEventListener('dragenter', (e) => {
  if (!e.dataTransfer?.types.includes('Files')) return;
  dragDepth++;
  dropOverlay.classList.add('visible');
});
window.addEventListener('dragleave', () => {
  dragDepth = Math.max(0, dragDepth - 1);
  if (!dragDepth) dropOverlay.classList.remove('visible');
});
window.addEventListener('dragover', (e) => e.preventDefault());
window.addEventListener('drop', (e) => {
  e.preventDefault();
  dragDepth = 0;
  dropOverlay.classList.remove('visible');
  const file = e.dataTransfer?.files[0];
  if (file) openFile(file);
});

// ---------- init ----------
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
setTheme((store.get('theme') as Theme) ?? (prefersDark ? 'dark' : 'light'));
setView((store.get('view') as View) ?? 'split');
setTocVisible(store.get('toc') === '1');
loadDocument(filename, store.get('content') ?? sample);
