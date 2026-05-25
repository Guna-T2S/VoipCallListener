import {ACTIVE_STORE_TYPES as ActiveStoreTypes} from './SelectTakeawayTypes';

export const setActiveStoreAction = activeStore => {
    return {
        type: ActiveStoreTypes.SET_ACTIVE_STORE,
        activeStore,
    };
};

export const updateActiveStoreAction = activeStore => {
    return {
        type: ActiveStoreTypes.UPDATE_ACTIVE_STORE,
        activeStore,
    };
};

export const resetActiveStoreAction = (activeStore, countryIso = null) => {
    return {
        type: ActiveStoreTypes.RESET_ACTIVE_STORE,
        store: activeStore,
        countryIso,
    };
};
