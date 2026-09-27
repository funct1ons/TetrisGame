import { defineConfig, type Plugin } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Remove web-only assets before Vite resolves them; the portable file has no dependencies.
const portablePage: Plugin = {
  name: 'portable-page',
  transformIndexHtml: {
    order: 'pre',
    handler: (html) => html.replace(/\s*<link\b[^>]*>/g, ''),
  },
  generateBundle: {
    order: 'post',
    handler(_, bundle) {
      const page = bundle['index.html'];
      if (page?.type !== 'asset') throw new Error('Portable HTML output is missing');
      delete bundle['index.html'];
      page.fileName = 'PRISM.html';
      bundle[page.fileName] = page;
    },
  },
};

export default defineConfig({
  base: './',
  publicDir: false,
  define: { 'import.meta.env.VITE_STANDALONE': 'true' },
  build: { outDir: 'portable', emptyOutDir: true },
  plugins: [portablePage, viteSingleFile()],
});
