import { TYPES_CONFIG } from 'mytakeaway/Redux/Actions/Types';
import * as AuthTypes from './AuthTypes';
import { isValidElement, isValidString } from 't2sbasemodule/Utils/helpers';
const INITIAL_STATE = {
    phone: '',
    userResponse: null,
    takeawayListResponse: [],
    loading: false,
    loginError: null,
    OTPError: null,
    otp: '',
    invalidSessionModal: false,
    tap2payPopupCount: 0
};

export default (state = INITIAL_STATE, action) => {
    switch (action.type) {
        case AuthTypes.LOGIN_API.LOGIN_USER_SUCCESS:
            return {
                ...state,
                loading: false,
                loginError: null,
                userResponse: action.payload
            };
        case AuthTypes.LOGIN_API.RESET_LOGIN_RESPONSE:
            return {
                ...state,
                loading: false,
                loginError: null,
                userResponse: null
            };
        case AuthTypes.LOGIN_API.LOGIN_USER_FAIL:
            return {
                ...state,
                loginError: action.payload,
                loading: false,
                userResponse: null
            };

        case AuthTypes.LOGIN_API.OTP_VERIFY_SUCCESS:
            return {
                ...state,
                loading: false,
                OTPError: null,
                takeawayListResponse: action.payload
            };

        case AuthTypes.LOGIN_API.OTP_VERIFY_FAIL:
            return {
                ...state,
                OTPError: action.payload,
                loading: false,
                takeawayListResponse: []
            };

        case AuthTypes.LOGIN_API.RESET_OTP_RESPONSE:
            return {
                ...state,
                loading: false,
                OTPError: null,
                takeawayListResponse: []
            };

        case AuthTypes.LOGIN_API.START_LOADING:
            return {
                ...state,
                loading: true
            };

        case AuthTypes.LOGIN_API.STOP_LOADING:
            return {
                ...state,
                loading: false
            };
        case AuthTypes.LOGIN_API.MODIFY_TAKEAWAY_IMAGE_URL_SUCCESS:
            return {
                ...state,
                takeawayListResponse: state.takeawayListResponse.map((item) => {
                    if (item.store_id === action.payload.id) {
                        return { ...item, website_logo_url: action.payload.url };
                    }
                    return item;
                })
            };
        case AuthTypes.LOGIN_API.MODIFY_TAKEAWAY_DETAILS_IN_LIST:
            return {
                ...state,
                takeawayListResponse: state.takeawayListResponse.map((item) => {
                    if (item.store_id === action.payload.id) {
                        return {
                            ...item,
                            name: action.payload.data.name,
                            number: action.payload.data.number,
                            flat: action.payload.data.flat,
                            postcode: action.payload.data.postcode,
                            street: action.payload.data.street,
                            town: action.payload.data.town,
                            email: action.payload.data.email,
                            phone: action.payload.data.phone,
                            city: isValidString(action.payload.data.city) ? action.payload.data.city : item.city,
                            neighborhood: isValidString(action.payload.data.neighborhood)
                                ? action.payload.data.neighborhood
                                : item.neighborhood,
                            municipality: isValidString(action.payload.data.municipality)
                                ? action.payload.data.municipality
                                : item.municipality,
                            country_id: action.payload.data.country_id
                        };
                    }
                    return item;
                })
            };
        case AuthTypes.LOGIN_API.INVALID_SESSION_ACTION:
            return {
                ...state,
                invalidSessionModal: action.payload
            };
        case AuthTypes.LOGIN_API.PERSISTS_PHONE_NUMBER:
            return {
                ...state,
                phone: isValidElement(action.payload) && isValidString(action.payload.phone) ? action.payload.phone : ''
            };
        case TYPES_CONFIG.UPDATE_TAP_TO_PAY_POPUP_COUNT:
            return {
                ...state,
                tap2payPopupCount: action.payload
            };
        default:
            return state;
    }
};
