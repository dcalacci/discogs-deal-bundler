import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

export default defineConfig({
  plugins: [preact()],
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'preact',
  },
  build: {
    rollupOptions: {
      input: {
        content: 'src/content.jsx',
      },
      output: {
        entryFileNames: '[name].js',
        format: 'iife',
        dir: '.',
      },
    },
    outDir: '.',
    emptyOutDir: false,
    minify: false, // Keep readable for debugging
  },
});

