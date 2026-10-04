import { defineConfig } from 'vite';

// GitHub Pages serves the site from /md-viewer/.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/md-viewer/' : '/',
}));
