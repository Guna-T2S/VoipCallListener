import {call, put, takeLatest} from '@redux-saga/core/effects';
import axios from 'axios';
import {
    CALL_ACTIONS,
    fetchCallCenterConfigSuccess,
    fetchCallCenterConfigFailure,
} from '../actions/callActions';

const CALL_CENTER_CONFIG_URL =
    'https://api.t2sonline.com/lang/mobile/myt/featuregate/config/callcenter.json';

function* fetchCallCenterConfig() {
    try {
        const response = yield call(axios.get, CALL_CENTER_CONFIG_URL);
        yield put(fetchCallCenterConfigSuccess(response.data));
    } catch (e) {
        yield put(fetchCallCenterConfigFailure(e?.message || 'Failed to fetch call center config'));
    }
}

export default function* callListenerSaga() {
    yield takeLatest(CALL_ACTIONS.CALL_LISTENER_SCREEN_LOADED, fetchCallCenterConfig);
}
