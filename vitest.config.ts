import path from 'node:path';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const root = path.resolve(__dirname);
const fromFiles = loadEnv('test', root, '').VITE_API_BASE_URL?.trim();
/** Non-empty placeholder so importing API modules does not throw; unit tests do not hit the network. */
const viteApiBaseUrl = fromFiles && fromFiles.length > 0 ? fromFiles : 'http://127.0.0.1:9';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    globals: false,
    env: {
      VITE_API_BASE_URL: viteApiBaseUrl,
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
