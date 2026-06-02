const fs = require('fs');
const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const root = path.resolve(__dirname, '..');
const exampleModules = path.resolve(__dirname, 'node_modules');
const rootModules = path.resolve(root, 'node_modules');

function resolvePackage(name) {
  const inExample = path.join(exampleModules, name);
  if (fs.existsSync(inExample)) {
    return inExample;
  }
  return path.join(rootModules, name);
}

const reactDir = resolvePackage('react');
const reactNativeDir = resolvePackage('react-native');
const hasExampleReactNative = fs.existsSync(path.join(exampleModules, 'react-native'));

const defaultConfig = getDefaultConfig(__dirname);

const config = {
  watchFolders: [root],
  resolver: {
    nodeModulesPaths: [exampleModules, rootModules],
    extraNodeModules: {
      react: reactDir,
      'react-native': reactNativeDir,
    },
    ...(hasExampleReactNative
      ? {
          blockList: [
            new RegExp(`${escapePath(rootModules)}/react-native/.*`),
            new RegExp(`${escapePath(rootModules)}/react/.*`),
          ],
        }
      : {}),
  },
};

function escapePath(p) {
  return p.replace(/[/\\]/g, '[/\\\\]');
}

module.exports = mergeConfig(defaultConfig, config);
