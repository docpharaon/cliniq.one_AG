import type { NextConfig } from 'next';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dir = path.dirname(__filename);

const nextConfig: NextConfig = {
    typescript: { ignoreBuildErrors: true },
    eslint: { ignoreDuringBuilds: true },
    devIndicators: false,
    output: 'standalone',
    webpack: (config) => {
        // Force single React instance in monorepo to prevent error #31
        const reactPath = path.dirname(require.resolve('react/package.json', { paths: [__dir] }));
        const reactDomPath = path.dirname(require.resolve('react-dom/package.json', { paths: [__dir] }));
        config.resolve.alias = {
            ...config.resolve.alias,
            react: reactPath,
            'react-dom': reactDomPath,
        };
        return config;
    },
};

export default nextConfig;
