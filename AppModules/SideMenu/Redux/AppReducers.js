import { FEATURE_GATE } from '../../../MyTakeaway/Redux/Actions/Types';
import { ADDRESS_CONFIG_TYPES } from './AppTypes';


const INITIAL_STATE = {
    callCenterConfig: [],
    updatedCallCenterConfig: [],
    countryConfigResponse: null
};

export default (state = INITIAL_STATE, action) => {
    switch (action.type) {
        case FEATURE_GATE.GET_CONFIG_FEATURE_GATE_DETAILS_SUCCESS:
            return {
                ...state,
                callCenterConfig: action.config
            };
        case FEATURE_GATE.UPDATE_CALL_CENTER_CONFIG:
            return {
                ...state,
                updatedCallCenterConfig: action.payload
            };
        case ADDRESS_CONFIG_TYPES.S3_CONFIG_SUCCESS:
            return {
                ...state,
                countryConfigResponse: action.payload
            };
        default:
            return state;
    }
};
