import React from 'react';
import { View } from 'react-native';

const T2SView = ({ style, children, ...props }) => (
    <View style={style}>{children}</View>
);

export default T2SView;
