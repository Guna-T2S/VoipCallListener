import Foundation
import CallKit

/**
 * iOS native module for call detection via CallKit (CXCallObserver).
 *
 * IMPORTANT LIMITATION:
 * Apple's sandbox restricts regular cellular call interception on iOS.
 * CXCallObserver fires for calls that go through the CallKit framework –
 * this includes VoIP calls and, on modern iOS, also GSM/cellular calls when
 * the app has the "Voice over IP" background mode enabled.
 *
 * The observer fires on *every* call state transition; we filter to
 * hasConnected=false + hasEnded=false (i.e. ringing/incoming) so the
 * webhook is sent only once, while the call is still ringing.
 *
 * To get the caller's phone number on iOS you must integrate with a VoIP
 * push (PushKit) flow or a server-side signalling channel – iOS does not
 * expose the caller number of GSM calls to third-party apps for privacy
 * reasons. The module sends whatever identifier is available from CXCall.
 */
@objc(CallDetectionModule)
class CallDetectionModule: NSObject, CXCallObserverDelegate {

    private var callObserver: CXCallObserver?
    private var hasReactEmitter: Bool = false
    private var sentCallUUIDs: Set<UUID> = []

    // Exposed to JS via RCTBridgeModule
    @objc static func requiresMainQueueSetup() -> Bool { false }

    @objc func startListening() {
        guard callObserver == nil else { return }
        callObserver = CXCallObserver()
        callObserver?.setDelegate(self, queue: .main)
    }

    @objc func stopListening() {
        callObserver = nil
        sentCallUUIDs.removeAll()
    }

    // MARK: – CXCallObserverDelegate

    func callObserver(_ callObserver: CXCallObserver, callChanged call: CXCall) {
        // We only care about incoming calls that are still ringing.
        // isOutgoing = false  → incoming direction
        // hasConnected = false → not yet answered
        // hasEnded = false    → still active
        guard !call.isOutgoing,
              !call.hasConnected,
              !call.hasEnded,
              !sentCallUUIDs.contains(call.uuid) else {
            return
        }

        sentCallUUIDs.insert(call.uuid)

        // CXCall does not expose the phone number on iOS for GSM calls.
        // For VoIP callers the number would come from your push payload.
        // We send the UUID so the server side can correlate with push data.
        let phoneNumber = "Unknown (iOS privacy restriction)"
        let countryCode = Locale.current.region?.identifier ?? "Unknown"

        // Emit event to JS layer
        sendEventToJS(phoneNumber: phoneNumber, countryCode: countryCode)
    }

    private func sendEventToJS(phoneNumber: String, countryCode: String) {
        guard let bridge = RCTBridge.current() else { return }
        bridge.enqueueJSCall(
            "RCTDeviceEventEmitter",
            method: "emit",
            args: [
                "onIncomingCall",
                ["phoneNumber": phoneNumber, "countryCode": countryCode],
            ],
            completion: nil
        )
    }
}
