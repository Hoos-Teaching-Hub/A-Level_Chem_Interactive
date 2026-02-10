import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // Allow GitHub Pages (or other static hosts) to set a base path without
  // changing the dev/preview experience.
  base: mode === 'production' ? process.env.VITE_BASE_PATH || '/' : '/',
}));
