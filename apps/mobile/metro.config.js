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

module.exports = config;
