# MD Viewer

A Markdown viewer and editor that runs in the browser (Vite + TypeScript).

## Run

```bash
npm install
npm run dev
```

`npm run build` writes a static site to `dist/`.

## Features

- Open files with the button, `Ctrl+O`, or drag and drop
- Edit, Split, and Preview views (`Ctrl+Alt+1/2/3`), with the preview scrolling along with the editor in Split
- GitHub-flavored Markdown (tables, task lists, strikethrough), with sanitized output
- Syntax-highlighted code blocks, each with a Copy button
- Outline sidebar for jumping between headings
- Light and dark themes
- Save as `.md` (`Ctrl+S`) or export as a standalone HTML page
- Your last document, view, and theme come back when you reopen the app (stored in localStorage)
