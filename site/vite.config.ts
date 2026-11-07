import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { Marked, Renderer } from 'marked';
import markedAlert from 'marked-alert';
import { createHighlighter } from 'shiki';
import { defineConfig } from 'vite';

const markdownParser = new Marked(markedAlert());

const highlighter = createHighlighter({ themes: ['github-light'], langs: ['typescript'] });

const root = fileURLToPath(new URL('./src/', import.meta.url));

export default defineConfig({
  root,
  base: '/bdd-expressions/',
  plugins: [
    {
      name: 'markdown-documents',
      async transformIndexHtml(html) {
        const page = html.includes('<!-- syntax -->')
          ? 'syntax'
          : html.includes('<!-- api -->')
            ? 'api'
            : undefined;
        if (!page) return html;
        let source = await readFile(new URL(`../docs/${page}.md`, import.meta.url), 'utf8');
        if (page === 'syntax') {
          const indexStart = source.indexOf('- [');
          const indexEnd = source.indexOf('\n## ');
          source = source.slice(0, indexStart) + source.slice(indexEnd);
        }
        const headings: { level: number; title: string; id: string }[] = [];
        const ids = new Map<string, number>();
        const highlight = await highlighter;
        const renderer = new Renderer();
        renderer.code = (token) => {
          const { text, lang } = token;
          if (lang !== 'ts' && lang !== 'typescript') return new Renderer().code(token);
          const code = highlight.codeToHtml(text, { lang: 'typescript', theme: 'github-light' });
          return `<div class="code-sample"><div class="code-sample-label">TypeScript</div>${code}</div>`;
        };
        const markdown = await markdownParser.parse(source, { renderer });
        const rendered = renderNamedParams(markdown).replace(
          /<h([1-6])>(.*?)<\/h\1>/g,
          (_, level: string, title: string) => {
            const base = title
              .replace(/<[^>]*>/g, '')
              .toLowerCase()
              .replace(/[^\w\s-]/g, '')
              .replace(/\s+/g, '-');
            const count = ids.get(base) ?? 0;
            ids.set(base, count + 1);
            const id = count ? `${base}-${count}` : base;
            headings.push({ level: Number(level), title, id });
            const permalink =
              page === 'api'
                ? ` <a class="heading-permalink" href="#${id}" aria-label="Permalink to this section" title="Link to this section"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7 .1l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7-.1l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg></a>`
                : '';
            return `<h${level} id="${id}">${title}${permalink}</h${level}>`;
          },
        );
        const index =
          '<ul>' +
          headings
            .filter(({ level }) => level === 2 || level === 3)
            .map(
              ({ level, title, id }) =>
                `<li class="index-level-${level}"><a href="#${id}">${sidebarTitle(title)}</a></li>`,
            )
            .join('') +
          '</ul>';
        return html
          .replace(`<!-- ${page}-index -->`, index)
          .replace(
            `<!-- ${page} -->`,
            rendered
              .replace(/href="(api|syntax)\.md/g, 'href="../$1/')
              .replace(
                /href="\.\.\/(src|test)\//g,
                'href="https://github.com/vitalets/bdd-expressions/blob/main/$1/',
              ),
          );
      },
    },
  ],
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: `${root}index.html`,
        syntax: `${root}syntax/index.html`,
        api: `${root}api/index.html`,
        headerOptions: `${root}header-options/index.html`,
      },
    },
  },
});

function renderNamedParams(html: string) {
  return html.replace(
    /(<td>Captured params \(named\)<\/td>\s*<td>)(<code>.*?)<\/td>/g,
    (_, cell: string, content: string) => {
      const code = content
        .replace(/<\/?code>/g, '')
        .replace(/<br\s*\/?>/g, '\n')
        .replaceAll('&nbsp;', ' ');
      return `${cell}<pre><code>${code}</code></pre></td>`;
    },
  );
}

function sidebarTitle(title: string) {
  if (!title.startsWith('<code>')) return title;
  const signature = title.replace(/<\/?code>/g, '');
  if (signature.startsWith('new ')) return 'constructor';
  return (
    signature
      .split('(')[0]!

      .replace(/^registry\./, '') + '()'
  );
}
