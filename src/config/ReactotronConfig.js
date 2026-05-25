const noop = () => {};

let reactotron = {
  log: noop,
  createEnhancer: noop,
};

if (__DEV__) {
  const Reactotron = require('reactotron-react-native').default;
  const {reactotronRedux} = require('reactotron-redux');
  const {NativeModules} = require('react-native');

  reactotron = Reactotron.configure({
    name: 'VoipCallListener',
    host: NativeModules?.SourceCode?.scriptURL
      ? new URL(NativeModules.SourceCode.scriptURL).hostname
      : 'localhost',
  })
    .useReactNative({
      asyncStorage: false,
      networking: {
        ignoreUrls: /symbolicate/,
      },
      editor: false,
      errors: {veto: () => false},
      overlay: false,
    })
    .use(reactotronRedux())
    .connect();

  console.tron = reactotron;
}

export default reactotron;
