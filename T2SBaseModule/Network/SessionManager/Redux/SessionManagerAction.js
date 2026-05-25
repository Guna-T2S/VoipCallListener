export const setAccessTokenAction = (activeStore, isPrimary = true) => ({
    type: 'SESSION_RESET_REFRESH_TOKEN_SUCCESS',
    payload: activeStore,
    isPrimary,
});

export const clearSessionAction = () => ({
    type: 'invalid_session',
});

export const setSessionMigrated = () => ({
    type: 'SET_SESSION_MIGRATED',
});

export const refreshAccessTokenAction = () => ({
    type: 'REFRESH_ACCESS_TOKEN',
});

export const resetPublicTokenOnMigration = () => ({
    type: 'RESET_PUBLIC_TOKEN_ON_MIGRATION',
});

export const resetSecondaryTokenAction = () => ({
    type: 'RESET_SECONDARY_TOKEN',
});

export const setSecondaryTakeawayActiveStoreAction = (storeData) => ({
    type: 'SET_SECONDARY_TAKEAWAY_ACTIVE_STORE',
    payload: storeData,
});
