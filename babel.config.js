const path = require('path');

module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./'],
        alias: {
          t2sbasemodule: path.resolve(__dirname, 'T2SBaseModule'),
          appmodules: path.resolve(__dirname, 'AppModules'),
          mytakeaway: path.resolve(__dirname, 'MyTakeaway'),
          webmodules: path.resolve(__dirname, 'WebModules'),
          selecttakeawaymodule: path.resolve(__dirname, 'AppModules/SelectTakeawayModule'),
          settingsmodule: path.resolve(__dirname, 'AppModules/SettingsModule'),
          ordersmodule: path.resolve(__dirname, 'AppModules/OrdersModule'),
        },
      },
    ],
  ],
};
