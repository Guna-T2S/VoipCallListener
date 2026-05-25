import React from 'react';
import CustomIcon from '../components/CustomIcon';
import { StyleSheet } from 'react-native';

const T2SCustomIcon = (props) => {
    let { onPress } = props;
    return (
        <CustomIcon
            style={StyleSheet.flatten([props?.color ? { color: props?.color } : style.style, props.style])}
            size={props.size}
            name={props.name}
            onPress={onPress}
        />
    );
};

const style = StyleSheet.create({
    style: {
        color: '#000'
    }
});

export default T2SCustomIcon;
