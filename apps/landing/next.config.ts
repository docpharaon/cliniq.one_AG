import type { NextConfig } from 'next';
import path from 'path';

const resolvePackage = (pkg: string) =>
    path.dirname(require.resolve(`${pkg}/package.json`));

const reactDir = resolvePackage('react');
const reactDomDir = resolvePackage('react-dom');

const nextConfig: NextConfig = {
    typescript: { ignoreBuildErrors: true },
    eslint: { ignoreDuringBuilds: true },
    devIndicators: false,

    // Webpack aliases only for local dev (monorepo dual-React fix)
    // Skipped on Vercel where only one React is installed
    ...(process.env.SKIP_WEBPACK_ALIAS
        ? {}
        : {
              webpack: (config: any) => {
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
          }),
};

export default nextConfig;
