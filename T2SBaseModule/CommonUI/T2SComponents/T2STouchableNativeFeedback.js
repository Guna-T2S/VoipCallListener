import React from 'react';
import { TouchableOpacity, Platform, TouchableNativeFeedback, View } from 'react-native';

const T2STouchableNativeFeedback = ({ style, children, onPress, disabled, activeOpacity, accessible, hitSlop, ...props }) => {
    if (Platform.OS === 'android') {
        return (
            <TouchableNativeFeedback onPress={onPress} disabled={disabled} useForeground hitSlop={hitSlop}>
                <View style={style}>{children}</View>
            </TouchableNativeFeedback>
        );
    }
    return (
        <TouchableOpacity style={style} onPress={onPress} disabled={disabled} activeOpacity={activeOpacity || 0.7} accessible={accessible} hitSlop={hitSlop}>
            {children}
        </TouchableOpacity>
    );
};

export default T2STouchableNativeFeedback;
