// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch all files in the monorepo
config.watchFolders = [monorepoRoot];

// Let Metro know where to resolve packages from
config.resolver.nodeModulesPaths = [
    path.resolve(projectRoot, 'node_modules'),
    path.resolve(monorepoRoot, 'node_modules'),
];

// Support video assets (mp4)
config.resolver.assetExts = [...(config.resolver.assetExts || []), 'mp4'];

// Force jspdf to use the browser-compatible ES module bundle instead of
// the node bundle which uses AMD require() and crashes Metro web.
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (platform === 'web' && moduleName === 'jspdf') {
        return {
            filePath: path.resolve(monorepoRoot, 'node_modules/jspdf/dist/jspdf.es.min.js'),
            type: 'sourceFile',
        };
    }
    if (platform === 'web' && moduleName === 'jspdf-autotable') {
        const autoTableEs = path.resolve(monorepoRoot, 'node_modules/jspdf-autotable/dist/jspdf.plugin.autotable.js');
        return {
            filePath: autoTableEs,
            type: 'sourceFile',
        };
    }
    if (originalResolveRequest) {
        return originalResolveRequest(context, moduleName, platform);
    }
    return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
