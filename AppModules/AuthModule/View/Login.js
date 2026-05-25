import React, { Component } from 'react';
import {
    ActivityIndicator,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    View,
    NativeModules,
    Linking,
    Alert
} from 'react-native';
import { connect } from 'react-redux';
// Redux
import {
    loginUserAction,
    onLogoutAction,
    resetLoginResponse,
    resetTakeawayListResponse,
    startLoadingAction,
    stopLoadingAction
} from '../Redux/AuthActions';
// utils
import { isArrayNonEmpty, isValidElement, isValidString, keyboardFocus, safeElementValue, getHitSlop } from 't2sbasemodule/Utils/helpers';
import { CONSTANTS, EVENT_LOG, GDPR_CONSTANTS, OTP_TYPE, SCREEN_NAME, VIEW_ID } from '../Utils/AuthConstants';
import { CountryImages } from '../Images/Country';
// ui
import { AppStyles, Palette } from 't2sbasemodule/Themes';
import styles from './Styles/LoginStyles';
// libs
import { showErrorMessage, showInfoMessage } from 't2sbasemodule/Network/NetworkHelpers';
import { SafeAreaViewUI, T2SButton, UnderlineHeaderText } from 't2sbasemodule/CommonUI';
import { AuthConfig } from '../Utils/AuthConfig';
import * as Analytics from 't2sbasemodule/Utils/Analytics';
import { LocalizationStrings } from 'appmodules/LocalizationModule/LocalizationStrings';
import T2STouchableNativeFeedback from 't2sbasemodule/CommonUI/T2SComponents/T2STouchableNativeFeedback';
import { AppConfig, LANGUAGE, SPANISH } from 't2sbasemodule/Utils/AppConfig';
import { getSupportQRCodeImage } from '../Utils/LoginHelpers';
import { DEFAULT_CONFIGURATOR } from 't2sbasemodule/CommonUI/components/configurator/Util/ConfiguratorConstants';
import T2SText from 't2sbasemodule/CommonUI/T2SComponents/T2SText';
import Bubbles from 'mytakeaway/NativeDependencies/RNLoader/RNLoader';
import { clearSessionAction, setAccessTokenAction } from 't2sbasemodule/Network/SessionManager/Redux/SessionManagerAction';
import { isFusionDevice, isWeb, isTabletDevice, isNormalDevice, isAndroid } from 't2sbasemodule/Utils/AppTypeHelper';
import {
    getCountryConfig,
    getFeatureGateDetailsAction,
    registerAndInitializeFusion,
    setActiveHostForFusionDevice,
    syncAndRegisterFusion
} from 'appmodules/SideMenu/Redux/AppActions';
import { setActiveStoreAction } from 'selecttakeawaymodule/Redux/SelectTakeawayActions';
import { setAppSyncAction } from 'appmodules/DashboardModule/Redux/DashboardActions';
import PhoneInput from 'react-native-phone-input';
import { getCountry } from 'country-from-iso2';
import CountryPicker from 'react-native-country-picker-modal';
import { updateDefaultLanguage } from 'settingsmodule/redux/SettingsAction';
import T2SImageBackground from 't2sbasemodule/CommonUI/T2SComponents/T2SImageBackground';
import T2SView from 't2sbasemodule/CommonUI/T2SComponents/T2SView';
import { IMAGE_URL } from 't2sbasemodule/Network/ApiConfig';
import WebView from 'react-native-webview';
import { gdprContentApiAction, resetGDPRState } from 'appmodules/FeaturesModule/Redux/FeaturesAction';
import { GDPRConstant } from '../../Terms&Policy/Utils/GDPRConstant';
import Modal from 't2sbasemodule/CommonUI/components/T2SRNModal';
import T2SCustomIcon from 't2sbasemodule/CommonUI/T2SComponents/T2SCustomIcon';
import { AppIcon } from 't2sbasemodule/Utils/AppIcon';
import T2STouchableOpacity from 't2sbasemodule/CommonUI/T2SComponents/T2STouchableOpacity';
import debounce from 'lodash/debounce';
// import { AppStoreSupport } from 'appmodules/SideMenu/Components/AppStoreSupport';
import { appsIconClickAction } from 'appmodules/DashboardModule/Utils/DashboardHelper';
import { HeaderConstants } from 'appmodules/Header/Utils/HeaderConstants';

let errorMessage;
let defaultConfig = DEFAULT_CONFIGURATOR;
let registerFusionInterval;
let shouldStartInterval = true;
let removeCountryCodePhoneNumber;

class Login extends Component {
    constructor(props) {
        super(props);
        this.openWifiSetting = this.openWifiSetting.bind(this);
        this.openApps = this.openApps.bind(this);
    }
    state = {
        disableLoginButton: true,
        phoneNumber: '',
        showErrorView: false,
        modalVisible: false,
        locale: AuthConfig.loginConfig.defaultCountry.value,
        selectedCountryImage: CountryImages.uk_flag,
        selectedCountryId: AuthConfig.loginConfig.defaultCountry.id,
        configuratorCount: 0,
        showLoginButton: false,
        supportQRCodeImage: getSupportQRCodeImage(AuthConfig.loginConfig.defaultCountry.id),
        isKeyboardShown: false,
        showProgressBar: false,
        initialCountry: this.props.countryCode,
        showCountryModal: false,
        selectedLanguage: this.props.selectedLanguage
    };
    componentDidMount() {
        Analytics.logScreen(SCREEN_NAME.LOGIN_SCREEN);
        this.props.getCountryConfig(null, null, null, !isValidString(this.props.selectedLanguage));
        isFusionDevice && !isValidElement(this.props.registerFusionRemoteId) && this.props.registerAndInitializeFusion();
        setTimeout(() => {
            keyboardFocus(this.phone);
        }, 500);
        if (
            isValidElement(this.props.takeawayListResponse) &&
            isValidElement(this.props.takeawayListResponse.length) &&
            this.props.takeawayListResponse.length > 0
        ) {
            if (isWeb) {
                if (!isValidElement(this.props.activeStore)) {
                    this.props.navigation.navigate(isTabletDevice ? 'fusionSelectTakeawayView' : 'selectTakeAway');
                } else {
                    this.props.navigation.navigate('Orders');
                }
            } else {
                this.props.navigation.navigate('appStack');
            }
        } else {
            this.props.clearSessionAction();
        }
        this.props.stopLoadingAction();
        if (isWeb) {
            const { apiToken } = AppConfig.gdpr;
            const productID = GDPRConstant.GDPR.Product.myTakeaway;
            this.props.gdprContentApiAction(
                apiToken,
                productID,
                GDPRConstant.GDPR.Policy.terms,
                GDPRConstant.GDPR.Policy.terms,
                GDPRConstant.GDPR.Policy.privacy
            );
        }
        this.keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', this._keyboardDidShow);
        this.keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', this._keyboardDidHide);
        // Handle case where Redux has persisted value but state wasn't initialized correctly
        if (isValidElement(this.props.countryCode) && !isValidElement(this.state.initialCountry)) {
            this.setState({ initialCountry: this.props.countryCode }, () => {
                // After state update, select the country in PhoneInput if ref is available
                if (isValidElement(this.phone) && isValidElement(this.state.initialCountry)) {
                    this.phone.selectCountry(this.state.initialCountry);
                }
            });
        } else if (isValidElement(this.state.initialCountry) && isValidElement(this.phone)) {
            // If state already has value, ensure PhoneInput is updated
            this.phone.selectCountry(this.state.initialCountry);
        }
    }

    componentDidUpdate(prevProps) {
        if (isValidElement(this.props.countryCode) && prevProps.countryCode !== this.props.countryCode) {
            this.setState({ initialCountry: this.props.countryCode }, () => {
                // After state update, select the country in PhoneInput
                if (isValidElement(this.phone) && isValidElement(this.state.initialCountry)) {
                    this.phone.selectCountry(this.state.initialCountry);
                }
            });
            setTimeout(() => {
                // Just Delay the process untill state update. This is only for fresh install
                keyboardFocus(this.phone);
            }, 100);
        }
        if (isValidElement(this.props.selectedLanguage) && prevProps.selectedLanguage !== this.props.selectedLanguage) {
            this.setState({ selectedLanguage: this.props.selectedLanguage }, () => Keyboard.dismiss());
        }
        if (isFusionDevice) {
            //commenting this as we are not going with auto login and implemented manual activate button near activation code
            // https://touch2success.atlassian.net/browse/COPS-1683
            // if (
            //     ((isValidElement(this.props.registerFusionRemoteId) &&
            //         prevProps.registerFusionRemoteId !== this.props.registerFusionRemoteId) ||
            //         !isValidElement(this.props.isRegisterFusionSuccess) ||
            //         (isValidElement(this.props.isRegisterFusionSuccess) && !this.props.isRegisterFusionSuccess)) &&
            //     shouldStartInterval
            // ) {
            //     this.syncRegisterFusion();
            // }
            if (
                prevProps.isRegisterFusionSuccess !== this.props.isRegisterFusionSuccess &&
                isValidElement(this.props.isRegisterFusionSuccess) &&
                this.props.isRegisterFusionSuccess
            ) {
                showInfoMessage(LocalizationStrings.LOGIN_SUCCESS, null, false, true);
                if (isArrayNonEmpty(this.props.takeawayListResponse)) {
                    if (this.props.takeawayListResponse.length === 1) {
                        // Uncomment this line when we enable JWT for EPOS - this.props.setAccessTokenAction(this.props.takeawayListResponse[0])
                        this.props.setActiveHostForFusionDevice(
                            this.props.generatedLicenseKey,
                            this.props.takeawayListResponse[0].host,
                            this.props.takeawayListResponse[0].license_key
                        );
                        this.props.setActiveStoreAction(this.props.takeawayListResponse[0]);
                        this.props.setAppSyncAction(this.props.takeawayListResponse[0].license_key, null, true);
                        this.props.getFeatureGateDetailsAction(this.props.takeawayListResponse[0].country_id);
                        this.props.navigation.navigate('appStack');
                    } else {
                        this.props.navigation.navigate('appStack', {
                            screen: 'mainScreen',
                            params: {
                                screen: 'fusionSelectTakeawayView'
                            }
                        });
                        // this.props.navigation.navigate(isTabletDevice ? 'fusionSelectTakeawayView' : 'selectTakeAway');
                    }
                }
                this.clearRegisterFusionSync();
            }
        }

        // If the Activation ID is not found then we will check for internet status true then we will call register sync
        if (
            !isValidElement(this.props.registerFusionRemoteId) &&
            this.props.isConnected !== prevProps.isConnected &&
            this.props.isConnected &&
            isFusionDevice
        ) {
            this.props.registerAndInitializeFusion();
        }

        if (prevProps.loginError !== this.props.loginError) {
            this.renderErrorView();
        }

        if (
            prevProps.userResponse !== this.props.userResponse ||
            prevProps.loginError !== this.props.loginError ||
            prevProps.loading !== this.props.loading
        ) {
            this.onLoginAPIComplete();
            this.renderErrorView();
        }
    }
    syncRegisterFusion() {
        if (!isValidElement(registerFusionInterval) && shouldStartInterval) {
            registerFusionInterval = setInterval(() => {
                if (isValidElement(this.props.registerFusionRemoteId)) {
                    this.props.syncAndRegisterFusion(this.props.generatedLicenseKey);
                }
            }, 10000);
        }
    }

    clearRegisterFusionSync() {
        if (isValidElement(registerFusionInterval)) {
            clearInterval(registerFusionInterval);
            registerFusionInterval = null;
            shouldStartInterval = false;
        }
    }

    componentWillUnmount() {
        this.keyboardDidShowListener.remove();
        this.keyboardDidHideListener.remove();
    }

    _keyboardDidShow = () => {
        this.setState({ isKeyboardShown: true });
    };

    _keyboardDidHide = () => {
        this.setState({ isKeyboardShown: false });
    };

    handleLoginClicked(phoneNumber) {
        // Check for network connectivity
        let formatPhoneNumber = this.phone.getValue().replace(/[^\d.-]/g, '');
        if (isArrayNonEmpty(this.state.locale?.callingCode) && this.state.locale.callingCode?.length === 1) {
            removeCountryCodePhoneNumber = formatPhoneNumber.replace(this.phone.getCountryCode(formatPhoneNumber), 0);
        } else {
            removeCountryCodePhoneNumber = '0' + this.phone.getValue().substring(this.state.locale.callingCode[0]?.length + 1);
        }
        if (this.props.isConnected && isValidString(phoneNumber)) {
            this.props.startLoadingAction();
            this.props.loginUserAction(
                this.state.locale?.name?.common?.toLowerCase(),
                removeCountryCodePhoneNumber,
                OTP_TYPE.SMS,
                this.state.selectedLanguage
            );
            Keyboard.dismiss();
            this.props.getCountryConfig(this.state.locale?.name?.common?.toLowerCase(), null, null, true);
            this.setState({ showProgressBar: true });
        }
    }

    onValidPhoneNumber() {
        this.setState({ showErrorView: false, showProgressBar: false });
        this.props.resetLoginResponse();
        this.clearRegisterFusionSync();
        this.props.navigation.navigate('otpScreen', {
            locale: this.state.locale?.name?.common?.toLowerCase(),
            phoneNumber: removeCountryCodePhoneNumber,
            countryImage: this.state.selectedCountryImage,
            otpLength: this.props.userResponse.length
        });
    }

    onLoginAPIComplete() {
        if (isValidElement(this.props.userResponse) && this.props.loginError === null && !this.props.loading) {
            this.onValidPhoneNumber();
        }
    }

    changeLanguageBasedOnCountry(data) {
        if ((isValidElement(data.image) && data.image === CountryImages.mexico_flag) || data.image === CountryImages.guatemala_flag) {
            this.props.updateDefaultLanguage(LANGUAGE[3]);
        } else {
            this.props.updateDefaultLanguage(safeElementValue(this.state.defaultLanguage, LANGUAGE[0]));
        }
    }
    handleCountryChanged(data) {
        this.changeLanguageBasedOnCountry(data);
        this.setState(
            {
                selectedCountryImage: data.image,
                phoneNumber: '',
                disableLoginButton: true,
                locale: data.value,
                showErrorView: false,
                selectedCountryId: data.id,
                showLoginButton: false,
                supportQRCodeImage: getSupportQRCodeImage(data.id)
            },
            () => {
                this.props.onLogoutAction();
            }
        );
    }
    checkToShowLoginButton() {
        return this.state.selectedCountryId !== 1;
    }

    checkToMakeLoginAPICall() {
        return this.state.selectedCountryId === 1;
    }

    setShowCountryModal(showCountryModal) {
        this.setState({ showCountryModal: showCountryModal });
    }

    renderSpinnerOrLoginButton() {
        Analytics.logEvent(EVENT_LOG.GENERATE_OTP_ACTION);
        if (this.props.loading) {
            return (
                <View style={styles.spinnerContainer}>
                    <ActivityIndicator size="small" />
                </View>
            );
        } else {
            return (
                <View style={styles.generateOTPViewStyle}>
                    <T2SButton
                        buttonStyle={StyleSheet.flatten(
                            this.state.disableLoginButton
                                ? [styles.generateOTPButtonCommonStyle, styles.generateOTPButtonDisableStyle]
                                : [styles.generateOTPButtonCommonStyle, styles.generateOTPButtonEnableStyle]
                        )}
                        buttonTextStyle={StyleSheet.flatten(
                            this.state.disableLoginButton
                                ? [styles.generateOTPTextStyle, styles.generateOTPTextDisableStyle]
                                : [styles.generateOTPTextStyle, styles.generateOTPTextEnableStyle]
                        )}
                        onPress={() => this.handleLoginClicked(this.state.phoneNumber)}
                        screenName={SCREEN_NAME.LOGIN_SCREEN}
                        id={VIEW_ID.GENERATE_OTP}
                        disabled={this.state.disableLoginButton}
                    >
                        {LocalizationStrings.GENERATE_OTP}
                    </T2SButton>
                </View>
            );
        }
    }

    renderErrorView() {
        const { loginError } = this.props;
        if (isValidElement(loginError)) {
            errorMessage = loginError.message;
            if (errorMessage === CONSTANTS.PHONE_NUM_NOT_ASSOCIATED) {
                this.setState({ showErrorView: true, showProgressBar: false });
                this.setState({ disableLoginButton: true });
            } else {
                this.setState({ showErrorView: false, showProgressBar: false });
                showErrorMessage(loginError);
            }
            this.props.resetLoginResponse();
        }
    }
    handleActivateButtonPressed = debounce(() => {
        this.props.syncAndRegisterFusion(this.props.generatedLicenseKey);
    }, 1000);
    renderFusionActivationCode() {
        return (
            <T2SView style={styles.activationView}>
                <T2SText style={styles.activationCodeText} id={VIEW_ID.REGISTER_WITH_US} screenName={SCREEN_NAME.LOGIN_SCREEN}>
                    {LocalizationStrings.ACTIVATION_CODE + this.props.registerFusionRemoteId}
                </T2SText>
                <T2SButton
                    buttonTextStyle={StyleSheet.flatten([
                        styles.generateOTPTextStyle,
                        styles.generateOTPTextEnableStyle,
                        styles.activateText
                    ])}
                    buttonStyle={StyleSheet.flatten([
                        styles.generateOTPButtonCommonStyle,
                        styles.generateOTPButtonEnableStyle,
                        styles.activateButtonStyle
                    ])}
                    onPress={this.handleActivateButtonPressed}
                    hitSlop={getHitSlop(10, 15)}
                >
                    {LocalizationStrings.ACTIVATE}
                </T2SButton>
            </T2SView>
        );
    }

    openWifiSetting() {
        NativeModules.FHDeviceInfo.navigateToNetworkSettings();
    }

    openApps() {
        appsIconClickAction();
    }

    RenderSettingsButton() {
        return (
            <View style={styles.acceptButtonViewStyle}>
                <T2STouchableOpacity onPress={this.openWifiSetting} style={styles.acceptButtonStyle}>
                    <T2SCustomIcon name={AppIcon.Wifi} size={45} screenName={SCREEN_NAME.LOGIN_SCREEN} />
                    <T2SText>{LocalizationStrings.WIFI}</T2SText>
                </T2STouchableOpacity>
                <T2STouchableOpacity onPress={this.openApps} style={styles.acceptButtonStyle}>
                    <T2SCustomIcon name={AppIcon.Features_Outline} size={45} screenName={SCREEN_NAME.LOGIN_SCREEN} />
                    <T2SText>{LocalizationStrings.APPS}</T2SText>
                </T2STouchableOpacity>
            </View>
        );
    }
    renderContent() {
        return (
            <SafeAreaViewUI style={AppStyles.container}>
                {/* {isTabletDevice && !isWeb && <WhatsAppQrCode supportQRCodeImage={this.state.supportQRCodeImage} />} */}
                {isFusionDevice && isAndroid && this.RenderSettingsButton()}
                {/* {isFusionDevice && isAndroid && <AppStoreSupport />} */}
                <View style={styles.viewStyle} screenName={SCREEN_NAME.LOGIN_SCREEN} id={VIEW_ID.MAIN_VIEW}>
                    {this.renderInputContent()}
                </View>
                {isFusionDevice && isValidString(this.props.registerFusionRemoteId) && this.renderFusionActivationCode()}
            </SafeAreaViewUI>
        );
    }

    renderNewContent() {
        return (
            <SafeAreaViewUI style={AppStyles.container}>
                <T2SImageBackground source={{ uri: IMAGE_URL.LOGIN_IMAGE_URL }} style={styles.imageStyle} resizeMode={'cover'}>
                    <T2SView style={styles.viewStyle}>
                        <View style={styles.textContainer}>
                            <T2SText style={styles.textStyle}>{LocalizationStrings.LOGIN_TEXT}</T2SText>
                        </View>
                        <View style={styles.cardStyle}>{this.renderInputContent()}</View>
                    </T2SView>
                </T2SImageBackground>
            </SafeAreaViewUI>
        );
    }

    displayPolicyContent(isFrom) {
        Linking.openURL(isFrom);
    }
    closeModal = () => {
        this.setState({ modalVisible: false });
    };
    showWebView() {
        const { gdprContent } = this.state;

        if (isValidString(gdprContent)) {
            return (
                <View style={styles.webViewWrapper} pointerEvents={'none'}>
                    <WebView
                        androidLayerType={'software'}
                        source={{ html: gdprContent }}
                        textZoom={isTabletDevice ? 30 : 100}
                        startInLoadingState={true}
                    />
                </View>
            );
        } else {
            return null;
        }
    }

    renderTermsModal() {
        return (
            <Modal isVisible={this.state.modalVisible} onBackdropPress={this.closeModal} style={styles.modalView}>
                <T2STouchableOpacity
                    style={styles.closeIconView}
                    onPress={this.closeModal}
                    screenName={SCREEN_NAME.LOGIN_SCREEN}
                    id={VIEW_ID.CLOSE_BUTTON_TOUCHABLE}
                >
                    <T2SCustomIcon name={AppIcon.Close} size={30} screenName={SCREEN_NAME.LOGIN_SCREEN} id={VIEW_ID.CLOSE_BUTTON} />
                </T2STouchableOpacity>
                {this.showWebView()}
            </Modal>
        );
    }
    renderTermsAndCondtion = () => {
        return (
            <View style={styles.checkboxContainer}>
                <T2SText>{LocalizationStrings.I_ACCEPT}</T2SText>
                <View style={styles.checkboxContainer}>
                    <T2STouchableOpacity
                        onPress={() => this.displayPolicyContent(GDPR_CONSTANTS.TERMS_AND_CONDITIONS)}
                        screenName={SCREEN_NAME.LOGIN_SCREEN}
                        id={VIEW_ID.TERMS_AND_CONDITION_TITLE}
                    >
                        <T2SText style={styles.termsText}>{LocalizationStrings.TERMS_AND_CONDITION}</T2SText>
                    </T2STouchableOpacity>
                    <T2SText style={styles.andText}>{LocalizationStrings.AND}</T2SText>
                    <T2STouchableOpacity
                        onPress={() => this.displayPolicyContent(GDPR_CONSTANTS.PRIVACY_POLICY)}
                        screenName={SCREEN_NAME.LOGIN_SCREEN}
                        id={VIEW_ID.PRIVACY_POLICY}
                    >
                        <T2SText style={styles.termsText}>{LocalizationStrings.PrivacyPolicy}</T2SText>
                    </T2STouchableOpacity>
                </View>
            </View>
        );
    };

    renderInputContent() {
        const { configuratorCount, isKeyboardShown, isTermsChecked } = this.state;
        return (
            <>
                <T2STouchableNativeFeedback
                    style={!isWeb ? styles.welcomeTextContainer : null}
                    activeOpacity={1}
                    onPress={() => {
                        if (AppConfig.buildConfig.buildType === 'debug') {
                            this.setState({ configuratorCount: configuratorCount + 1 }, () => {
                                if (configuratorCount === 5) {
                                    this.props.navigation.navigate('Configurator', { isFromLogin: true });
                                    this.setState({ configuratorCount: 0 });
                                }
                            });
                        }
                    }}
                    accessible={false}
                >
                    <UnderlineHeaderText
                        textStyle={styles.welcomeTextStyle}
                        text={LocalizationStrings.WELCOME}
                        screenName={SCREEN_NAME.LOGIN_SCREEN}
                        id={VIEW_ID.WELCOME}
                    />
                </T2STouchableNativeFeedback>
                <ScrollView
                    contentContainerStyle={AppStyles.scrollViewStyle}
                    keyboardShouldPersistTaps="handled"
                    style={AppStyles.container}
                >
                    <View style={isKeyboardShown ? styles.inputViewKeyboardAppStyle : styles.inputViewStyle}>
                        <PhoneInput
                            ref={(ref) => (this.phone = ref)}
                            style={styles.phoneInputViewStyle}
                            initialCountry={isValidElement(this.state.initialCountry) ? this.state.initialCountry : null}
                            onChangePhoneNumber={(value, iso2) => {
                                this.setState({
                                    initialCountry: iso2,
                                    phoneNumber: value,
                                    locale: getCountry(iso2),
                                    showErrorView: false,
                                    disableLoginButton:
                                        isValidElement(this.phone) && isValidString(value) && !this.phone.isValidNumber(value)
                                });
                            }}
                            autoFormat={true}
                            flagStyle={styles.flagStyle}
                            textStyle={styles.phoneNumberTextStyle}
                            onPressFlag={this.setShowCountryModal.bind(this, true)}
                            textProps={{ maxLength: 21, disableFullscreenUI: true }}
                        />
                        <View
                            style={[
                                styles.underLineViewStyle,
                                this.state.showErrorView ? styles.showErrorViewStyle : styles.showNormalViewStyle
                            ]}
                        />
                        {this.state.showCountryModal && this.renderCountryPicker()}
                        {!this.state.showErrorView && !isWeb && (
                            <View style={styles.errorInputViewStyle}>
                                <Text style={styles.registeredMobileNumberTextStyle}>
                                    {LocalizationStrings.ADD_COUNTRY_CODE_FOR_REGISTERED_MOBILE_NUMBER}
                                </Text>
                            </View>
                        )}
                        {isWeb && this.renderTermsAndCondtion()}
                        {this.state.showErrorView && (
                            <View style={styles.errorViewStyle}>
                                <Text style={styles.errorMessageTextStyle}>
                                    {errorMessage === CONSTANTS.PHONE_NUM_NOT_ASSOCIATED
                                        ? LocalizationStrings.USER_LOGIN_ERROR
                                        : errorMessage === LocalizationStrings.INVALID_MOBILE_NUMBER
                                        ? errorMessage
                                        : LocalizationStrings.SERVER_ERROR}
                                </Text>
                            </View>
                        )}
                    </View>
                    {this.renderSpinnerOrLoginButton()}
                </ScrollView>
            </>
        );
    }

    progressLoader() {
        return <View style={styles.bubbleViewStyle}>{isWeb ? <ActivityIndicator /> : <Bubbles size={7} color={Palette.green} />}</View>;
    }

    renderCountryPicker() {
        return (
            <CountryPicker
                visible={this.state.showCountryModal}
                onSelect={(country) => {
                    this.phone.selectCountry(country.cca2.toLowerCase());
                    this.setState({ initialCountry: country.cca2, showCountryModal: false });
                }}
                translation="eng"
                withFilter={true}
                withAlphaFilter={false}
                withCallingCode={true}
                withCountryNameButton={false}
                placeholder={null}
                onClose={this.setShowCountryModal.bind(this, false)}
            />
        );
    }

    render() {
        if (Platform.OS === 'ios') {
            return (
                <KeyboardAvoidingView style={AppStyles.container} behavior={'padding'}>
                    {this.renderContent()}
                </KeyboardAvoidingView>
            );
        } else if (isWeb && isTabletDevice) {
            return <>{this.renderNewContent()}</>;
        } else {
            return <View style={AppStyles.container}>{this.renderContent()}</View>;
        }
    }
}

const mapStateToProps = (state) => ({
    loginError: state.authState.loginError,
    loading: state.authState.loading,
    userResponse: state.authState.userResponse,
    isConnected: state.appState.connectionStatus,
    takeawayListResponse: state.authState.takeawayListResponse,
    selectedLanguage: state.appState.defaultLanguage?.name,
    defaultLanguage: state.appState.defaultLanguage,
    activeStore: state.activeStoreState.activeStore,
    registerFusionRemoteId: state.appState.registerFusionRemoteId,
    isRegisterFusionSuccess: state.appState.isRegisterFusionSuccess,
    countryCode: state.appState.countryConfigResponse?.country?.flag,
    generatedLicenseKey: state.appState.generatedLicenseKey,
    GDPRTermsAndCondition: state.featuresState.GDPRTermsAndCondition,
    GDPRPrivacyPolicy: state.featuresState.GDPRPrivacyPolicy
});
const mapDispatchToProps = {
    loginUserAction,
    resetLoginResponse,
    startLoadingAction,
    resetTakeawayListResponse,
    stopLoadingAction,
    updateDefaultLanguage,
    clearSessionAction,
    registerAndInitializeFusion,
    syncAndRegisterFusion,
    setActiveStoreAction,
    setAppSyncAction,
    getFeatureGateDetailsAction,
    setAccessTokenAction,
    getCountryConfig,
    onLogoutAction,
    setActiveHostForFusionDevice,
    gdprContentApiAction,
    resetGDPRState
};
export default connect(mapStateToProps, mapDispatchToProps)(Login);
