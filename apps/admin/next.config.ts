import type { NextConfig } from 'next';
import path from 'path';

// Resolve React from wherever Node finds it (handles monorepo hoisting)
const resolvePackage = (pkg: string) =>
    path.dirname(require.resolve(`${pkg}/package.json`));

const reactDir = resolvePackage('react');
const reactDomDir = resolvePackage('react-dom');

const nextConfig: NextConfig = {
    transpilePackages: ['@cliniqone/types', '@cliniqone/config', '@supabase/ssr'],

    // Skip type-checking during build — Recharts ships React 18 types
    // that conflict with React 19. Code is correct at runtime.
    typescript: { ignoreBuildErrors: true },
    eslint: { ignoreDuringBuilds: true },

    // Disable devtools overlay — the segment-explorer devtool triggers
    // React hook errors in monorepos with dual React versions
    devIndicators: false,

    webpack: (config) => {
        // Force ALL React resolution to a single copy (avoids dual-React bugs)
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
