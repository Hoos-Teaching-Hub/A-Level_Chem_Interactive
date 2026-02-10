import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const root = new URL('.', import.meta.url).pathname;
  const env = loadEnv(mode, root, '');

  return {
    plugins: [react()],
    // Allow GitHub Pages (or other static hosts) to set a base path without
    // changing the dev/preview experience.
    base: mode === 'production' ? env.VITE_BASE_PATH || '/' : '/',
  };
});
