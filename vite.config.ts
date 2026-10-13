import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  base: process.env.ETAXI_BASE || '/',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        concept: resolve(__dirname, 'concept.html'),
        notfound: resolve(__dirname, '404.html'),
      },
    },
  },
});
