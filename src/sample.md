# Welcome to MD Viewer

A fast, private Markdown viewer and editor. Everything stays in your browser.

## Getting started

- **Open** a `.md` file with the *Open* button, `Ctrl+O`, or drag & drop it anywhere.
- **Edit** in the left pane; the preview updates as you type.
- **Save** downloads the Markdown (`Ctrl+S`); **Export HTML** creates a standalone page.
- Switch views with `Ctrl+Alt+1` / `2` / `3` (Edit / Split / Preview).
- Toggle the **Outline** to jump between headings.

Your last document is restored automatically when you come back.

## Formatting

You can write **bold**, *italic*, ~~strikethrough~~, `inline code`, and [links](https://commonmark.org).

> Blockquotes look like this.
> They can span multiple lines.

### Task lists

- [x] Render GitHub-flavored Markdown
- [x] Syntax-highlight code blocks
- [ ] Write something great

### Tables

| Feature          | Supported |
| ---------------- | :-------: |
| Tables           |    ✅     |
| Task lists       |    ✅     |
| Syntax highlight |    ✅     |
| Dark mode        |    ✅     |

### Code

```ts
interface Doc {
  name: string;
  words: number;
}

function summarize(doc: Doc): string {
  return `${doc.name}: ${doc.words} words`; // highlighted!
}
```

```python
def fib(n: int) -> int:
    a, b = 0, 1
    for _ in range(n):
        a, b = b, a + b
    return a
```

---

Happy writing! ✍️
