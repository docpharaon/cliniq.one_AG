import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
    typescript: { ignoreBuildErrors: true },
    eslint: { ignoreDuringBuilds: true },
    devIndicators: false,
    webpack: (config) => {
        // Force single React instance in monorepo to prevent error #31
        config.resolve.alias = {
            ...config.resolve.alias,
            react: path.resolve(__dirname, 'node_modules/react'),
            'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
        };
        return config;
    },
};

export default nextConfig;
