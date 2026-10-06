// Metro config for use inside the npm-workspaces monorepo.
// Lets Metro resolve the symlinked @rubies/shared package and the hoisted
// dependencies at the repo root. See: https://docs.expo.dev/guides/monorepos/
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch all files in the monorepo so changes to packages/shared hot-reload.
config.watchFolders = [monorepoRoot];

// 2. Resolve modules from the app first, then the workspace root.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// 3. Don't crawl/watch what the phone app never imports. Metro starts a file
// watcher over everything in watchFolders and gives up after 4 minutes
// ("Failed to start watch mode"). On a slow disk the ~60k files in this
// monorepo can exceed that. These are the web/backend toolchains only.
const notForMobile = [
  /[\\/]apps[\\/]web[\\/].*/,
  /[\\/]apps[\\/]api[\\/].*/,
  /[\\/]\.git[\\/].*/,
  /[\\/]node_modules[\\/](next|@next|@swc|prisma|@prisma|typescript|eslint|@eslint|@typescript-eslint)[\\/].*/,
];
config.resolver.blockList = [].concat(config.resolver.blockList ?? [], notForMobile);

module.exports = config;
