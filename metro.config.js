const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Workaround for Windows/OneDrive path issues with node: protocol
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
