import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';

function spaFallback(): Plugin {
  return {
    name: 'spa-fallback',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (
          req.url &&
          !req.url.startsWith('/inventory') &&
          !req.url.startsWith('/delivery') &&
          !req.url.includes('.') &&
          req.headers.accept?.includes('text/html')
        ) {
          req.url = '/index.html';
        }
        if (
          req.url &&
          req.url.startsWith('/delivery/') &&
          !req.url.includes('.') &&
          req.headers.accept?.includes('text/html')
        ) {
          req.url = '/delivery.html';
        }
        next();
      });
    },
  };
}

export default defineConfig(() => {
    return {
      appType: 'mpa',
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react(), spaFallback()],
      build: {
        rollupOptions: {
          input: {
            main: path.resolve(__dirname, 'index.html'),
            inventory: path.resolve(__dirname, 'inventory.html'),
            delivery: path.resolve(__dirname, 'delivery.html'),
          },
        },
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
