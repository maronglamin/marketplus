// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname, {
  // [Web-only]: Enables CSS support in Metro.
  isCSSEnabled: true,
});

// Add any custom configuration here
// Enable SVG support via react-native-svg-transformer
const currentAssetExts = config.resolver.assetExts || [];
const currentSourceExts = config.resolver.sourceExts || [];
config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve('react-native-svg-transformer'),
};
config.resolver.assetExts = currentAssetExts.filter((ext) => ext !== 'svg');
config.resolver.sourceExts = Array.from(new Set([...currentSourceExts, 'svg']));

// Enable Hermes
config.transformer.minifierConfig = {
  compress: {
    drop_console: false,
  },
};

// Add module resolution
config.resolver.nodeModulesPaths = [path.resolve(__dirname, 'node_modules')];
config.resolver.extraNodeModules = {
  '@components': path.resolve(__dirname, 'src/components'),
  '@screens': path.resolve(__dirname, 'src/screens'),
  '@navigation': path.resolve(__dirname, 'src/navigation'),
  '@services': path.resolve(__dirname, 'src/services'),
  '@contexts': path.resolve(__dirname, 'src/contexts'),
  '@utils': path.resolve(__dirname, 'src/utils'),
  '@api': path.resolve(__dirname, 'src/api'),
  '@theme': path.resolve(__dirname, 'src/theme'),
};

module.exports = config; 