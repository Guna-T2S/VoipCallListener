import React from 'react';
import { Text } from 'react-native';

const T2SText = ({ style, children, ...props }) => (
    <Text style={[{ fontFamily: 'Lato-Regular', color: '#1a1a1a' }, style]} {...props}>
        {children}
    </Text>
);

export default T2SText;
