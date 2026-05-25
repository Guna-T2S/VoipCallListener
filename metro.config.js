const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const path = require('path');

const config = {
  resolver: {
    extraNodeModules: {
      t2sbasemodule: path.resolve(__dirname, 'T2SBaseModule'),
      appmodules: path.resolve(__dirname, 'AppModules'),
      selecttakeawaymodule: path.resolve(__dirname, 'AppModules/SelectTakeawayModule'),
      settingsmodule: path.resolve(__dirname, 'AppModules/SettingsModule'),
      ordersmodule: path.resolve(__dirname, 'AppModules/OrdersModule'),
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
