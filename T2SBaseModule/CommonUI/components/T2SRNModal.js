import React from 'react';
import { Modal, View, TouchableOpacity } from 'react-native';

const T2SRNModal = ({ isVisible, onBackdropPress, style, children, ...props }) => (
    <Modal visible={isVisible} transparent animationType="slide" onRequestClose={onBackdropPress}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} activeOpacity={1} onPress={onBackdropPress}>
            <View style={[{ flex: 1, justifyContent: 'center', alignItems: 'center' }, style]}>
                <TouchableOpacity activeOpacity={1}>
                    {children}
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    </Modal>
);

export default T2SRNModal;
