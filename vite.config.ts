import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Use a relative env directory to avoid Node-global `process` in CI type checks.
  const env = loadEnv(mode, '', '');

  return {
    plugins: [react()],
    // Allow GitHub Pages (or other static hosts) to set a base path without
    // changing the dev/preview experience.
    base: mode === 'production' ? env.VITE_BASE_PATH || '/' : '/',
  };
});
