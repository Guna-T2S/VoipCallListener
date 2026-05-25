import React from 'react';
import { ActivityIndicator } from 'react-native';

const Bubbles = ({ size, color }) => (
    <ActivityIndicator size="small" color={color || '#2d6a4f'} />
);

export default Bubbles;
