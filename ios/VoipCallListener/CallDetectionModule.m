#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

// Expose the Swift class to the React Native bridge
RCT_EXTERN_MODULE(CallDetectionModule, NSObject)

RCT_EXTERN_METHOD(startListening)
RCT_EXTERN_METHOD(stopListening)
