import { StyleSheet } from 'react-native';

export const Palette = {
    green: '#2d6a4f',
    paleBlue: '#4A90D9',
    suvaGrey: '#888888',
    pureBlack: '#000000',
    black: '#1a1a1a',
    white: '#ffffff',
    red: '#F44336',
    grey: '#cccccc',
    lightGrey: '#f0f4f8',
};

export const AppStyles = StyleSheet.create({
    container: { flex: 1 },
    scrollViewStyle: { flexGrow: 1 },
    hitSlopStyle: { top: 10, bottom: 10, left: 10, right: 10 },
});

export const Colors = {
    primaryColor: Palette.green,
    secondaryColor: Palette.paleBlue,
    textColor: Palette.black,
    backgroundColor: Palette.lightGrey,
};
