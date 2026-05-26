import React from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export const T2SButton = ({ buttonStyle, buttonTextStyle, onPress, disabled, children, ...props }) => (
    <TouchableOpacity style={buttonStyle} onPress={onPress} disabled={disabled}>
        <Text style={buttonTextStyle}>{children}</Text>
    </TouchableOpacity>
);

export const SafeAreaViewUI = ({ style, children, ...props }) => (
    <SafeAreaView style={[{ flex: 1 }, style]}>{children}</SafeAreaView>
);

export const UnderlineHeaderText = ({ text, textStyle, ...props }) => (
    <View>
        <Text style={textStyle}>{text}</Text>
        <View style={{ height: 3, backgroundColor: '#2d6a4f', marginTop: 4, width: 40 }} />
    </View>
);

export const T2SMaterialTextInput = ({ style, value, onChangeText, error, maxLength, keyboardType, autoFocus, tintColor, materialRef, onFocus, activeLineWidth, ...props }) => (
    <View>
        <TextInput
            ref={materialRef}
            style={[{ borderBottomWidth: activeLineWidth || 1, borderBottomColor: tintColor || '#888', paddingVertical: 8, fontSize: 18, color: '#1a1a1a' }, style]}
            value={value}
            onChangeText={onChangeText}
            maxLength={maxLength}
            keyboardType={keyboardType}
            autoFocus={autoFocus}
            onFocus={onFocus}
        />
        {error ? <Text style={{ color: '#F44336', fontSize: 12, marginTop: 4 }}>{error}</Text> : null}
    </View>
);

export const Separator = () => <View style={{ height: 1, backgroundColor: '#e0e0e0' }} />;
export const CardView = ({ style, children }) => <View style={style}>{children}</View>;
export const SizedBox = ({ height, width }) => <View style={{ height, width }} />;
export const ProgressLoader = () => null;
export const BackIcon = () => null;
export const HamburgerIcon = () => null;
export const OTPView = () => null;
export const Banner = () => null;
export const T2SModal = () => null;
export const T2SPopupMenu = () => null;
export const T2SDropdown = () => null;
export const TextInputCountrySelection = () => null;
export const T2SMaskedFieldSetInput = () => null;
