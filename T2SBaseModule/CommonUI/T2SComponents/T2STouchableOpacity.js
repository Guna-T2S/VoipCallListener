import React from 'react';
import { TouchableOpacity } from 'react-native';

const T2STouchableOpacity = ({ style, children, onPress, disabled, activeOpacity, hitSlop, ...props }) => (
    <TouchableOpacity style={style} onPress={onPress} disabled={disabled} activeOpacity={activeOpacity || 0.7} hitSlop={hitSlop}>
        {children}
    </TouchableOpacity>
);

export default T2STouchableOpacity;
