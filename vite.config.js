import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({
    base: process.env.VERCEL || process.env.NODE_ENV !== 'production' ? '/' : '/The12thHouse/',
    plugins: [react()],
    server: { host: '0.0.0.0', allowedHosts: ['4173-idwexis3rnnw0026eexaj-38275ff9.us4.manus.computer'] },
    test: {
        environment: 'jsdom',
        globals: true,
    },
});
