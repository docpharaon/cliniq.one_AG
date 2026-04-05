import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    define: {
        'process.env': {},
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'src'),
            '@cliniqone/api': path.resolve(__dirname, '../../packages/api/src'),
            '@cliniqone/config': path.resolve(__dirname, '../../packages/config/src'),
            '@cliniqone/i18n': path.resolve(__dirname, '../../packages/i18n/src'),
            '@cliniqone/types': path.resolve(__dirname, '../../packages/types/src'),
            '@cliniqone/ui': path.resolve(__dirname, '../../packages/ui/src'),
        },
    },
    build: {
        outDir: 'dist',
        sourcemap: false,
    },
    server: {
        port: 3003,
    },
});
