import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    output: 'export',
    basePath: '/cliniq',
    assetPrefix: '/cliniq',
    images: { unoptimized: true },
    typescript: { ignoreBuildErrors: true },
    eslint: { ignoreDuringBuilds: true },
    devIndicators: false,
};

export default nextConfig;
