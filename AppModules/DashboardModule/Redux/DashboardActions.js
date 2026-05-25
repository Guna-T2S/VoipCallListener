export const getSettingsAction = (apiToken) => ({
    type: 'GET_SETTINGS',
    apiToken,
});

export const getDashboardAction = (accessToken, host, deviceToken, phone) => ({
    type: 'DASHBOARD_API_CALLS',
    accessToken,
    host,
    deviceToken,
    phone,
});

export const setAppSyncAction = (accessToken, userPhoneNo, getMenuFirstTime) => ({
    type: 'APP_SYNC',
    accessToken,
    userPhoneNo,
    getMenuFirstTime,
});

export const getCancelReasonAction = (apiToken) => ({
    type: 'GET_CANCEL_REASON',
    apiToken,
});

export const resetSettingsAction = () => ({
    type: 'RESET_SETTINGS',
});

export const resetDashboardActions = () => ({
    type: 'RESET_DASHBOARD',
});

export const setOnboardStatusActions = (status) => ({
    type: 'SET_ONBOARD_STATUS',
    status,
});
