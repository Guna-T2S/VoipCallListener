import React, { Component } from 'react';
import { View } from 'react-native';
import { connect } from 'react-redux';

class OnBoardDeciderScreen extends Component {
    componentDidMount() {
        // In VoipCallListener we navigate to SelectTakeaway after OTP verify
        // This screen is only reached if a single store auto-selects
        if (this.props.navigation) {
            this.props.navigation.navigate('SelectTakeaway');
        }
    }

    render() {
        return <View />;
    }
}

const mapStateToProps = () => ({});
const mapDispatchToProps = {};

export default connect(mapStateToProps, mapDispatchToProps)(OnBoardDeciderScreen);
