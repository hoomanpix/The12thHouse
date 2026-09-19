var _a;
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({
    // Vercel serves this project from the domain root. GitHub Pages can opt in to
    // its repository subpath by setting VITE_BASE_PATH=/new-wave/ when building.
    base: (_a = process.env.VITE_BASE_PATH) !== null && _a !== void 0 ? _a : '/',
    plugins: [react()],
    server: {
        allowedHosts: true,
    },
    test: {
        environment: 'jsdom',
        globals: true,
    },
});
