import type { NextConfig } from 'next';
import path from 'path';

// Resolve React from wherever Node finds it (handles monorepo hoisting)
const resolvePackage = (pkg: string) =>
    path.dirname(require.resolve(`${pkg}/package.json`));

const reactDir = resolvePackage('react');
const reactDomDir = resolvePackage('react-dom');

const nextConfig: NextConfig = {
    transpilePackages: ['@cliniqone/types', '@cliniqone/config', '@supabase/ssr'],

    typescript: { ignoreBuildErrors: true },
    eslint: { ignoreDuringBuilds: true },

    devIndicators: false,

    // Static export for Capacitor wrapping (set CAPACITOR_BUILD=1)
    ...(process.env.CAPACITOR_BUILD === '1' ? { output: 'export' } : {}),

    webpack: (config) => {
        config.resolve = config.resolve || {};
        config.resolve.alias = {
            ...config.resolve.alias,
            react: reactDir,
            'react-dom': reactDomDir,
            'react/jsx-runtime': path.join(reactDir, 'jsx-runtime'),
            'react/jsx-dev-runtime': path.join(reactDir, 'jsx-dev-runtime'),
            'react-dom/server': path.join(reactDomDir, 'server'),
            'react-dom/client': path.join(reactDomDir, 'client'),
        };

        return config;
    },
};

export default nextConfig;
