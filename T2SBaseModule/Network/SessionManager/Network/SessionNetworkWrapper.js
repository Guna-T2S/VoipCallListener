import axios from 'axios';

const BASE_URL = 'https://api.touch2success.com';

export const apiCall = function* (requestConfig, params) {
    const config = requestConfig(params);
    const response = yield axios({
        method: config.method || 'GET',
        url: `${BASE_URL}${config.url}`,
        data: config.data,
        headers: config.config?.headers || {},
    });
    return response.data;
};
