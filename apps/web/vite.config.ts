import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { webPort, apiUrl } from '../../scripts/ports.js';

const allowedHosts = new Set([`127.0.0.1:${webPort}`, `localhost:${webPort}`]);
const loopbackHostGuard: Plugin = {
  name: 'loopback-host-guard',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (!allowedHosts.has(req.headers.host ?? '')) {
        res.statusCode = 403;
        res.end('Host is not allowed');
        return;
      }
      next();
    });
  },
};

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [loopbackHostGuard, react()],
  server: {
    host: '127.0.0.1', port: webPort, strictPort: true,
    allowedHosts: ['localhost'],
    proxy: { '/api': { target: apiUrl, changeOrigin: true } },
  },
  preview: { host: '127.0.0.1', port: webPort, strictPort: true },
  build: { outDir: 'dist', emptyOutDir: true },
});
