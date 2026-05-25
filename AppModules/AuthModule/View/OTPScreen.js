import React, { Component } from 'react';
import { Keyboard, KeyboardAvoidingView, Linking, Platform, ScrollView, Text, View } from 'react-native';
import OfflineNotice from 't2sbasemodule/CommonUI/components/OfflineNotice';
// Redux
import {
    loginUserAction,
    otpVerifyAction,
    persistsMobileNoAction,
    resetLoginResponse,
    resetTakeawayListResponse,
    startLoadingAction,
    stopLoadingAction
} from '../Redux/AuthActions';
import { connect } from 'react-redux';
// ui
import styles from './Styles/OTPScreenStyles';
import LoginStyles from './Styles/LoginStyles';
import { AppStyles, Palette } from 't2sbasemodule/Themes';
// utils
import { CONSTANTS, EVENT_LOG, ICONS, OTP_TYPE, SCREEN_NAME, VIEW_ID } from '../Utils/AuthConstants';
import {
    getUrlPathNames,
    isArrayNonEmpty,
    isValidElement,
    isValidString,
    keyboardFocus,
    parseValueFromURL,
    safeIntValue
} from 't2sbasemodule/Utils/helpers';
import { showErrorMessage } from 't2sbasemodule/Network/NetworkHelpers';
import { AuthConfig } from '../Utils/AuthConfig';
import { SafeAreaViewUI, T2SMaterialTextInput, UnderlineHeaderText } from 't2sbasemodule/CommonUI';
import * as Analytics from 't2sbasemodule/Utils/Analytics';
import T2STouchableNativeFeedback from 't2sbasemodule/CommonUI/T2SComponents/T2STouchableNativeFeedback';
import { LocalizationStrings } from 'appmodules/LocalizationModule/LocalizationStrings';
import {
    getCancelReasonAction,
    getDashboardAction,
    getSettingsAction,
    setAppSyncAction
} from 'appmodules/DashboardModule/Redux/DashboardActions';
import { setActiveStoreAction } from 'appmodules/SelectTakeawayModule/Redux/SelectTakeawayActions';
import OnBoardDeciderScreen from 'mytakeaway/View/OnBoardDeciderScreen';
import { getFeatureGateDetailsAction, getFreemiumPremiumModules, setActiveHostForFusionDevice } from '../../SideMenu/Redux/AppActions';
import T2SText from 't2sbasemodule/CommonUI/T2SComponents/T2SText';
import { AppIcon } from 't2sbasemodule/Utils/AppIcon';
import T2SCustomIcon from 't2sbasemodule/CommonUI/T2SComponents/T2SCustomIcon';
import Bubbles from 'mytakeaway/NativeDependencies/RNLoader/RNLoader';
import { ActivityIndicator } from 'react-native';
import { clearSessionAction, setAccessTokenAction } from 't2sbasemodule/Network/SessionManager/Redux/SessionManagerAction';
import { isFusionDevice, isMS, isWeb, isTabletDevice, isNormalDevice } from 't2sbasemodule/Utils/AppTypeHelper';
import { formatPhoneNo } from 'ordersmodule/Utils/OrderHelpers';
import { getPrinterAction } from 'settingsmodule/redux/SettingsAction';
import { ROUTER_LIST_IDENTIFIER } from 'appmodules/SideMenu/SideMenuConstants';
import debounce from 'lodash/debounce';
import T2SImageBackground from 't2sbasemodule/CommonUI/T2SComponents/T2SImageBackground';
import { IMAGE_URL } from 't2sbasemodule/Network/ApiConfig';
import T2SView from 't2sbasemodule/CommonUI/T2SComponents/T2SView';

class OTPScreen extends Component {
    constructor() {
        super();
        this.handleValueChangeOfText = this.handleValueChangeOfText.bind(this);
        this.handletextInput = this.handletextInput.bind(this);
        this.focusOTPTextInput = this.focusOTPTextInput.bind(this);
    }
    componentDidMount() {
        Analytics.logScreen(SCREEN_NAME.OTP_SCREEN);
        const { route } = this.props;
        const { phoneNumber, locale, otpLength } = route.params;

        setTimeout(() => {
            keyboardFocus(this.textInputRef);
        }, 500);
        this.props.stopLoadingAction();
        this.startOTPTimer();
        this.setState({
            phoneNumber: phoneNumber,
            locale: locale,
            otpLength: otpLength
        });
        if (isNormalDevice && !isWeb) {
            this.registerForOtpAutoFill();
        }
        this.keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', this._keyboardDidShow);
    }

    componentWillUnmount() {
        if (isValidElement(this.linkingUrl)) {
            this.linkingUrl.remove('url', this.handleOpenURL);
        }
        if (isValidElement(this.keyboardDidShowListener)) {
            this.keyboardDidShowListener.remove();
        }
    }

    componentDidUpdate(prevProps) {
        if (isValidString(this.props.countryIso) && prevProps?.countryIso !== this.props.countryIso) {
            setTimeout(() => {
                keyboardFocus(this.textInputRef);
            }, 100);
        }
        
        // Navigate to SelectTakeaway when takeaway list arrives after OTP verify
        if (
            prevProps.takeawayListResponse !== this.props.takeawayListResponse &&
            isArrayNonEmpty(this.props.takeawayListResponse)
        ) {
            this.props.navigation.navigate('SelectTakeaway');
            return;
        }

        // Handle OTP API completion - moved from render to componentDidUpdate
        if (this.props.error !== prevProps.error && isValidElement(this.props.error)) {
            this.onOTPAPIComplete();
        }
    }

    _keyboardDidShow = () => {
        if (isValidElement(this.scrollRef)) {
            this.scrollRef.scrollToEnd({ animated: true });
        }
    };
    handletextInput(ref) {
        this.textInputRef = ref;
    }
    state = {
        phoneNumber: '',
        locale: '',
        showErrorView: false,
        otpTimer: AuthConfig.authConfig.OTPResentTimer,
        otpString: '',
        activeStore: null,
        enableResend: false,
        typingUnderLineColor: false,
        showProgressBar: false
    };

    registerForOtpAutoFill = () => {
        this.handleOpenURL = this.handleOpenURL.bind(this);
        Linking.getInitialURL()
            .then((url) => {
                if (url) {
                    this.navigate(url);
                }
            })
            .catch((err) => console.error('An error occurred', err));
        this.linkingUrl = Linking.addEventListener('url', this.handleOpenURL);
    };

    navigate(url) {
        if (getUrlPathNames(url).includes(ROUTER_LIST_IDENTIFIER.OTP_AUTO_REFILL)) {
            const otpCode = parseValueFromURL(url, 'otp');
            if (otpCode != null) {
                this.handleValueChangeOfText(otpCode);
            }
        }
    }

    handleOpenURL(event) {
        this.navigate(event.url);
    }

    startOTPTimer() {
        setTimeout(() => {
            this.setState({ enableResend: true });
        }, AuthConfig.authConfig.OTPResentTimer * 1000);
    }

    reStartOTPTimer(type) {
        if (this.state.enableResend) {
            const otpType = type === LocalizationStrings.RESEND_SMS ? OTP_TYPE.SMS : OTP_TYPE.CALL;
            const { locale } = this.state;
            if (isValidElement(this.textInputRef)) {
                this.textInputRef.focus();
            }

            this.setState({
                enableResend: false,
                otpTimer: AuthConfig.authConfig.OTPResentTimer,
                showErrorView: false,
                otpString: ''
            });
            this.startOTPTimer();
            if (this.state.phoneNumber !== '' && locale !== '') {
                this.props.loginUserAction(locale, this.state.phoneNumber, otpType, this.props.selectedLanguage);
            }
        }
    }

    debouncedVerifyAction = debounce((text, phoneNumber, locale) => {
        this.props.otpVerifyAction(text, phoneNumber, locale, this.props.selectedLanguage);
    }, 500);

    handleValueChangeOfText(text) {
        let regex = new RegExp(/^[0-9]+$/);
        let otpText = isValidString(text) ? text.replace(/\D/g, '') : '';
        this.setState(
            {
                otpString: otpText,
                showErrorView: false
            },
            () => {
                if (regex.test(text) && Number(text.length) === Number(this.otpLength())) {
                    Keyboard.dismiss();
                    Analytics.logEvent(EVENT_LOG.OTP_CLICKED_EVENT, { status: text });
                    const { phoneNumber, locale } = this.state;
                    if (phoneNumber !== '' && text !== '' && this.props.isConnected) {
                        this.setState({ showProgressBar: true });
                        this.debouncedVerifyAction(text, phoneNumber, locale);
                    }
                }

                if (text.length === 0 && !isWeb) {
                    this.setState({
                        typingUnderLineColor: false
                    });
                } else {
                    this.setState({
                        typingUnderLineColor: true
                    });
                }
            }
        );
    }

    switchToStoreId = (storeItem) => {
        if (!isFusionDevice && !isMS) {
            this.props.setAccessTokenAction(storeItem);
        }
        if (isFusionDevice) {
            this.props.setActiveHostForFusionDevice(this.props.generatedLicenseKey, storeItem.host, storeItem.license_key);
        }
        this.props.setActiveStoreAction(storeItem);
        this.props.setAppSyncAction(storeItem.license_key, null, true);
        this.props.getCancelReasonAction(storeItem.license_key);
        this.props.getPrinterAction(storeItem.license_key);
        this.props.getFeatureGateDetailsAction(storeItem.country_id);
       
        this.props.getFreemiumPremiumModules(storeItem.store_id);
        this.setState({ activeStore: storeItem });
      
        if (isNormalDevice && !isWeb) {
            this.props.getDashboardAction(storeItem.license_key, storeItem.host, null, storeItem.contact_no);
        }
    };

    onOTPAPIComplete() {
        if (isValidElement(this.props.error) && this.props.error.message === CONSTANTS.INVALID_AUTH) {
            this.renderOTPErrorViewFor3Seconds();
        } else if (isValidElement(this.props.error)) {
            this.setState({
                otpNumber: '',
                showErrorView: false,
                showProgressBar: false
            });
            if (this.props.error.message === CONSTANTS.OTP_EXPIRED) {
                setTimeout(() => {
                    this.props.navigation.goBack();
                }, 3500);
            }
            showErrorMessage(this.props.error);
            this.props.resetTakeawayListResponse();
        }
    }

    renderOTPErrorViewFor3Seconds() {
        this.setState({ showErrorView: true, showProgressBar: false });
        this.props.resetTakeawayListResponse();
    }
    onGoBack() {
        this.setState({ showErrorView: false, otpString: '' });
        this.props.clearSessionAction();
        this.props.navigation.goBack();
        this.props.stopLoadingAction();
    }

    otpLength = () => (safeIntValue(this.state.otpLength) > 0 ? this.state.otpLength : 4);

    renderOTPButton(icon) {
        const { enableResend } = this.state;
        if (this.state.otpTimer === 0) {
            clearInterval(this.timer);
        }
        return (
            <T2STouchableNativeFeedback
                id={icon === ICONS.SMS_ICON ? VIEW_ID.RESEND_OTP : VIEW_ID.CALL_ME_INSTEAD}
                screenName={SCREEN_NAME.OTP_SCREEN}
                onPress={() =>
                    this.reStartOTPTimer(icon === ICONS.SMS_ICON ? LocalizationStrings.RESEND_SMS : LocalizationStrings.CALL_ME_INSTEAD)
                }
                style={icon === ICONS.SMS_ICON ? styles.otpButtonLeft : styles.otpButtonRight}
            >
                <T2SCustomIcon
                    style={styles.buttonIconDisabled}
                    name={icon}
                    screenName={SCREEN_NAME.OTP_SCREEN}
                    size={40}
                    id={icon === ICONS.SMS_ICON ? VIEW_ID.RESEND_OTP_ICON : VIEW_ID.CALL_ME_INSTEAD_ICON}
                />
                <T2SText
                    style={!enableResend ? styles.buttonTextDisabled : styles.buttonText}
                    screenName={SCREEN_NAME.OTP_SCREEN}
                    id={
                        icon === ICONS.SMS_ICON
                            ? enableResend
                                ? VIEW_ID.RESEND_OTP_TEXT + VIEW_ID.ENABLED
                                : VIEW_ID.RESEND_OTP_TEXT
                            : enableResend
                            ? VIEW_ID.CALL_ME_INSTEAD_TEXT + VIEW_ID.ENABLED
                            : VIEW_ID.CALL_ME_INSTEAD
                    }
                >
                    {icon === ICONS.SMS_ICON ? LocalizationStrings.RESEND_SMS : LocalizationStrings.CALL_ME_INSTEAD}
                </T2SText>
            </T2STouchableNativeFeedback>
        );
    }

    renderCustomHeader = () => {
        return (
            <View style={styles.customHeader}>
                <View style={styles.backIconStyle}>
                    <T2STouchableNativeFeedback onPress={() => this.onGoBack()}>
                        <T2SCustomIcon
                            name={AppIcon.Back}
                            size={35}
                            style={styles.backArrowStyle}
                            id={VIEW_ID.BACK_BUTTON_OTP}
                            screenName={SCREEN_NAME.OTP_SCREEN}
                        />
                    </T2STouchableNativeFeedback>

                    <View style={styles.welcomeTextContainer}>
                        <UnderlineHeaderText
                            textStyle={styles.welcomeTextStyle}
                            text={LocalizationStrings.WELCOME}
                            screenName={SCREEN_NAME.LOGIN_SCREEN}
                            id={VIEW_ID.WELCOME}
                        />
                    </View>
                </View>
            </View>
        );
    };

    focusOTPTextInput() {
        if (isWeb) {
            this.setState({
                typingUnderLineColor: true
            });
        }
    }

    renderOTPContent() {
        const { showErrorView, otpLength, phoneNumber, otpString, typingUnderLineColor, showProgressBar } = this.state;
        return (
            <SafeAreaViewUI>
                <OfflineNotice isFullScrceenView={true} needToShowMessage={true} />
                {!isWeb && this.renderCustomHeader()}
                <ScrollView
                    ref={(ref) => (this.scrollRef = ref)}
                    contentContainerStyle={AppStyles.scrollViewStyle}
                    keyboardShouldPersistTaps="handled"
                    style={AppStyles.container}
                    showsVerticalScrollIndicator={false}
                >
                    <KeyboardAvoidingView behavior={'padding'}>
                        <View style={isTabletDevice && !isWeb ? styles.contentContainer : null}>
                            <View style={!isWeb ? styles.otpContainer : null}>
                                <Text style={styles.instruction}>
                                    {LocalizationStrings.SENT_OTP_TO + otpLength + LocalizationStrings.DIGIT_OTP}
                                </Text>
                                <T2STouchableNativeFeedback
                                    id={VIEW_ID.CALL_ME_INSTEAD}
                                    screenName={SCREEN_NAME.OTP_SCREEN}
                                    style={styles.editPhoneStyle}
                                    hitSlop={AppStyles.hitSlopStyle}
                                    onPress={() => {
                                        this.onGoBack();
                                    }}
                                >
                                    <Text style={styles.phoneNumber}>{formatPhoneNo(phoneNumber, this.props.countryIso)}</Text>
                                    <T2SCustomIcon
                                        style={styles.editIconStyle}
                                        name={AppIcon.Edit}
                                        size={20}
                                        id={VIEW_ID.BACK_BUTTON_OTP}
                                        screenName={SCREEN_NAME.OTP_SCREEN}
                                    />
                                </T2STouchableNativeFeedback>
                            </View>
                            <View
                                style={isWeb ? styles.textInputContainerViewStyle : isTabletDevice ? null : styles.inputContainerViewStyle}
                            >
                                <T2SMaterialTextInput
                                    activeLineWidth={2}
                                    style={styles.textInputStyle}
                                    maxLength={this.otpLength() === 4 ? 4 : 6}
                                    keyboardType="numeric"
                                    value={otpString}
                                    error={showErrorView ? LocalizationStrings.PLEASE_ENTER_A_VALID_OTP : ''}
                                    onChangeText={this.handleValueChangeOfText}
                                    id={VIEW_ID.OTP_INPUT_FIELD}
                                    screenName={SCREEN_NAME.OTP_SCREEN}
                                    autoFocus={true}
                                    tintColor={typingUnderLineColor ? Palette.paleBlue : Palette.suvaGrey}
                                    materialRef={this.handletextInput}
                                    onFocus={this.focusOTPTextInput}
                                />
                                {showProgressBar && this.progressLoader()}
                            </View>
                            <View style={[styles.buttonContainer, !showProgressBar && { marginTop: 14 }]}>
                                {this.renderOTPButton(ICONS.SMS_ICON)}
                                <View style={styles.verticalDivider} />
                                {this.renderOTPButton(ICONS.CALL_ICON)}
                            </View>
                        </View>
                    </KeyboardAvoidingView>
                </ScrollView>
            </SafeAreaViewUI>
        );
    }

    progressLoader() {
        return <View style={styles.bubbleViewStyle}>{isWeb ? <ActivityIndicator /> : <Bubbles size={7} color={Palette.green} />}</View>;
    }
    renderOnBoardingDecider = () => {
        return <OnBoardDeciderScreen activeStore={this.state.activeStore} navigation={this.props.navigation} from={'otpScreen'} />;
    };

    renderNewContent() {
        return (
            <SafeAreaViewUI style={AppStyles.container}>
                <T2SImageBackground source={{ uri: IMAGE_URL.LOGIN_IMAGE_URL }} style={LoginStyles.imageStyle} resizeMode={'cover'}>
                    <View style={styles.backArrowContainerStyle}>
                        <T2STouchableNativeFeedback onPress={() => this.onGoBack()}>
                            <T2SCustomIcon
                                name={AppIcon.Back}
                                size={35}
                                style={styles.backArrowStyle}
                                id={VIEW_ID.BACK_BUTTON_OTP}
                                screenName={SCREEN_NAME.OTP_SCREEN}
                            />
                        </T2STouchableNativeFeedback>
                    </View>
                    <T2SView style={LoginStyles.viewStyle}>
                        <View>
                            <View style={LoginStyles.textContainer}>
                                <T2SText style={LoginStyles.textStyle}>{LocalizationStrings.WELCOME}</T2SText>
                            </View>
                            <View style={LoginStyles.cardStyle}>{this.renderOTPContent()}</View>
                        </View>
                    </T2SView>
                </T2SImageBackground>
            </SafeAreaViewUI>
        );
    }

    render() {
        if (isValidElement(this.state.activeStore)) {
            return this.renderOnBoardingDecider();
        }
        if (Platform.OS === 'ios') {
            return (
                <KeyboardAvoidingView style={AppStyles.container} behavior={'padding'}>
                    {this.renderOTPContent()}
                </KeyboardAvoidingView>
            );
        } else if (isWeb && isTabletDevice) {
            return <>{this.renderNewContent()}</>;
        } else {
            return this.renderOTPContent();
        }
    }
}

const mapStateToProps = (state) => ({
    error: state.authState.OTPError,
    loading: state.authState.loading,
    userResponse: state.authState.userResponse,
    isConnected: state.appState.connectionStatus,
    takeawayListResponse: state.authState.takeawayListResponse,
    selectedLanguage: state.appState.defaultLanguage?.name,
    generatedLicenseKey: state.appState.generatedLicenseKey,
    countryIso: state.appState.countryConfigResponse?.country?.iso,
    latestSelectedStoreId: state.appState?.latestSelectedStoreId
});

const mapDispatchToProps = {
    otpVerifyAction,
    resetTakeawayListResponse,
    loginUserAction,
    resetLoginResponse,
    startLoadingAction,
    stopLoadingAction,
    getSettingsAction,
    setActiveStoreAction,
    setAppSyncAction,
    persistsMobileNoAction,
    getPrinterAction,
    getFreemiumPremiumModules,
    clearSessionAction,
    getFeatureGateDetailsAction,
    setAccessTokenAction,
    setActiveHostForFusionDevice,
    getCancelReasonAction,
    getDashboardAction
};

export default connect(mapStateToProps, mapDispatchToProps)(OTPScreen);
