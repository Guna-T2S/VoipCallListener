import React from 'react';
import { ImageBackground } from 'react-native';

const T2SImageBackground = ({ style, children, source, resizeMode, ...props }) => (
    <ImageBackground style={style} source={source} resizeMode={resizeMode}>
        {children}
    </ImageBackground>
);

export default T2SImageBackground;
