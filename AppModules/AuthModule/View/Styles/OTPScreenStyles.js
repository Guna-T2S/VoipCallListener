import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
    customHeader: { paddingTop: 10, paddingHorizontal: 16 },
    backIconStyle: { flexDirection: 'row', alignItems: 'center' },
    backArrowStyle: { color: '#2d6a4f' },
    backArrowContainerStyle: { paddingTop: 50, paddingLeft: 16 },
    welcomeTextContainer: { marginLeft: 12 },
    welcomeTextStyle: { fontSize: 22, fontWeight: '700', color: '#1a1a1a' },
    contentContainer: { paddingHorizontal: 20 },
    otpContainer: { marginTop: 20 },
    instruction: { fontSize: 14, color: '#666', lineHeight: 20 },
    editPhoneStyle: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
    phoneNumber: { fontSize: 16, fontWeight: '600', color: '#1a1a1a' },
    editIconStyle: { marginLeft: 8, color: '#2d6a4f' },
    inputContainerViewStyle: { marginTop: 24 },
    textInputContainerViewStyle: { marginTop: 24 },
    textInputStyle: { fontSize: 24, fontWeight: '600', letterSpacing: 8 },
    buttonContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 30 },
    otpButtonLeft: { flex: 1, alignItems: 'center', paddingVertical: 12 },
    otpButtonRight: { flex: 1, alignItems: 'center', paddingVertical: 12 },
    verticalDivider: { width: 1, backgroundColor: '#e0e0e0' },
    buttonIconDisabled: { color: '#888' },
    buttonText: { fontSize: 13, color: '#2d6a4f', marginTop: 4 },
    buttonTextDisabled: { fontSize: 13, color: '#aaa', marginTop: 4 },
    bubbleViewStyle: { marginTop: 12, alignItems: 'center' },
});

export default styles;
