const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Ensure these files types are included
config.resolver.assetExts.push(
  // Adds support for `.db` files for SQLite databases
  'db'
);

// Force all React imports to use the same instance
config.resolver.alias = {
  'react': path.resolve(__dirname, 'node_modules/react'),
  'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
};

module.exports = config;
