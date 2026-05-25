import { ACTIVE_STORE_TYPES as ActiveStoreTypes } from './SelectTakeawayTypes';
import { isValidString } from 't2sbasemodule/Utils/helpers';

const INITIAL_STATE = {
    activeStore: null
};

export default (state = INITIAL_STATE, action) => {
    switch (action.type) {
        case ActiveStoreTypes.SET_ACTIVE_STORE:
            return {
                ...state,
                activeStore: action.activeStore
            };
        case ActiveStoreTypes.UPDATE_ACTIVE_STORE:
            return {
                ...state,
                activeStore: action.activeStore
            };
        case ActiveStoreTypes.RESET_ACTIVE_STORE:
            return INITIAL_STATE;
        default:
            return state;
    }
};
