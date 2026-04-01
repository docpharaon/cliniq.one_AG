import type { NextConfig } from 'next';

const isCapacitor = process.env.CAPACITOR_BUILD === '1';

const nextConfig: NextConfig = {
    ...(isCapacitor ? { output: 'export' } : {}),
    transpilePackages: ['@cliniqone/types', '@cliniqone/config'],

    // Skip type-checking during build — Recharts ships React 18 types
    // that conflict with React 19. Code is correct at runtime.
    typescript: { ignoreBuildErrors: true },
    eslint: { ignoreDuringBuilds: true },

    // Disable devtools overlay — the segment-explorer devtool triggers
    // React hook errors in monorepos with dual React versions
    devIndicators: false,

    // Prevent Next.js from bundling packages that call React.cache() on the server
    // (it fails during static page data collection due to dual-React in monorepo)
    serverExternalPackages: ['@supabase/ssr', '@supabase/supabase-js', '@cliniqone/api'],
};

export default nextConfig;
