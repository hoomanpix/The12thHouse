import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: process.env.VERCEL || process.env.NODE_ENV !== 'production' ? '/' : '/The12thHouse/',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
