const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const root = path.resolve(__dirname, '..');
const exampleModules = path.resolve(__dirname, 'node_modules');
const rootModules = path.resolve(root, 'node_modules');

// Single React/RN instance for the whole bundle (app + linked library source).
const reactDir = path.join(exampleModules, 'react');
const reactNativeDir = path.join(exampleModules, 'react-native');

const defaultConfig = getDefaultConfig(__dirname);

const config = {
  watchFolders: [root],
  resolver: {
    // Do not walk up from repo-root src/ into root/node_modules/react.
    nodeModulesPaths: [exampleModules],
    extraNodeModules: {
      react: reactDir,
      'react-native': reactNativeDir,
      'react-native-screen-security': root,
    },
    blockList: [
      // Library jest/devDeps — must not be bundled alongside example's React.
      new RegExp(`${escapePath(rootModules)}/react/.*`),
      new RegExp(`${escapePath(rootModules)}/react-native/.*`),
      // Nested duplicates (e.g. hoisted sub-deps).
      /node_modules\/.*\/node_modules\/react\/.*/,
      /node_modules\/.*\/node_modules\/react-native\/.*/,
    ],
    resolveRequest(context, moduleName, platform) {
      if (moduleName === 'react' || moduleName === 'react-native') {
        return {
          type: 'sourceFile',
          filePath: require.resolve(moduleName, { paths: [exampleModules] }),
        };
      }
      return context.resolveRequest(context, moduleName, platform);
    },
  },
};

function escapePath(p) {
  return p.replace(/[/\\]/g, '[/\\\\]');
}

module.exports = mergeConfig(defaultConfig, config);
