import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
    plugins: [react(), tailwindcss()],
    define: {
        'process.env': {},
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'src'),
            '@cliniqone/types': path.resolve(__dirname, '../../packages/types/src'),
            '@cliniqone/config': path.resolve(__dirname, '../../packages/config/src'),
            '@cliniqone/ui': path.resolve(__dirname, '../../packages/ui/src'),
        },
    },
    build: {
        outDir: 'dist',
        sourcemap: false,
    },
    server: {
        port: 3001,
    },
});
