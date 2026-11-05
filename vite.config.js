import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    optimizeDeps: {
      force: true,
    },
    resolve: {
      alias: {
        '@': path.resolve(projectRoot),
      },
    },
    server: {
      // HMR is attached to the Express HTTP server in server.js.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
