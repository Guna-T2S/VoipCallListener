import axios from 'axios';
import { BASE_API_CONFIG } from 't2sbasemodule/Network/ApiConfig';

export const apiCall = function* (requestConfig, params) {
    const config = requestConfig(params);
    const response = yield axios({
        method: config.method || 'GET',
        url: `${BASE_API_CONFIG.baseURL}${config.url}`,
        data: config.data,
        headers: config.config?.headers || {},
    });
    return response.data;
};
