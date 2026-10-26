import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';
import { defineConfig } from 'vite';

const root = fileURLToPath(new URL('./src/', import.meta.url));

export default defineConfig({
  root,
  base: '/bdd-expressions/',
  plugins: [
    {
      name: 'syntax-document',
      async transformIndexHtml(html) {
        if (!html.includes('<!-- syntax -->')) return html;
        const source = await readFile(new URL('../docs/syntax.md', import.meta.url), 'utf8');
        const indexStart = source.indexOf('- [');
        const indexEnd = source.indexOf('\n## ');
        const index = await marked.parse(source.slice(indexStart, indexEnd));
        const rendered = renderNamedParams(
          await marked.parse(source.slice(0, indexStart) + source.slice(indexEnd)),
        );
        html = html.replace('<!-- syntax-index -->', index);
        const anchored = rendered.replace(
          /<h([1-6])>(.*?)<\/h\1>/g,
          (_, level: string, title: string) => {
            const id = title
              .replace(/<[^>]*>/g, '')
              .toLowerCase()
              .replace(/[^\w\s-]/g, '')
              .replace(/\s+/g, '-');
            return `<h${level} id="${id}">${title}</h${level}>`;
          },
        );
        return html.replace(
          '<!-- syntax -->',
          anchored.replaceAll(
            'href="api.md',
            'href="https://github.com/vitalets/bdd-expressions/blob/main/docs/api.md',
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
