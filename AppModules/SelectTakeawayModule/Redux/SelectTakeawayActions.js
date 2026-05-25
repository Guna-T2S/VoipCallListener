import { ACTIVE_STORE_TYPES } from './SelectTakeawayTypes';

export const setActiveStoreAction = (activeStore) => ({
    type: ACTIVE_STORE_TYPES.SET_ACTIVE_STORE,
    activeStore,
});

export const updateActiveStoreAction = (activeStore) => ({
    type: ACTIVE_STORE_TYPES.UPDATE_ACTIVE_STORE,
    activeStore,
});

export const resetActiveStoreAction = (activeStore, countryIso = null) => ({
    type: ACTIVE_STORE_TYPES.RESET_ACTIVE_STORE,
    store: activeStore,
    countryIso,
});
