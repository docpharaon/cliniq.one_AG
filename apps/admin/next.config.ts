import type { NextConfig } from 'next';
import path from 'path';

const adminNodeModules = path.resolve(__dirname, 'node_modules');

const nextConfig: NextConfig = {
    transpilePackages: ['@cliniqone/types', '@cliniqone/config', '@supabase/ssr'],

    // Disable devtools overlay — the segment-explorer devtool triggers
    // React hook errors in monorepos with dual React versions
    devIndicators: false,

    webpack: (config) => {
        // Force ALL React resolution to admin's local node_modules (React 19)
        config.resolve = config.resolve || {};
        config.resolve.alias = {
            ...config.resolve.alias,
            react: path.resolve(adminNodeModules, 'react'),
            'react-dom': path.resolve(adminNodeModules, 'react-dom'),
            'react/jsx-runtime': path.resolve(adminNodeModules, 'react/jsx-runtime'),
            'react/jsx-dev-runtime': path.resolve(adminNodeModules, 'react/jsx-dev-runtime'),
            'react-dom/server': path.resolve(adminNodeModules, 'react-dom/server'),
            'react-dom/client': path.resolve(adminNodeModules, 'react-dom/client'),
        };

        return config;
    },
};

export default nextConfig;
