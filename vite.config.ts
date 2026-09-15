import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Vercel serves this project from the domain root. GitHub Pages can opt in to
  // its repository subpath by setting VITE_BASE_PATH=/new-wave/ when building.
  base: process.env.VITE_BASE_PATH ?? '/',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
