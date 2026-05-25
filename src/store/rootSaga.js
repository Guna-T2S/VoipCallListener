import {all} from '@redux-saga/core/effects';
import watchIncomingCalls from '../sagas/callSaga';
import callListenerSaga from '../sagas/callListenerSaga';
import appSaga from 'appmodules/SideMenu/Redux/AppSaga';
import authSaga from 'appmodules/AuthModule/Redux/AuthSaga';

export default function* rootSaga() {
  yield all([watchIncomingCalls(), callListenerSaga(), authSaga(), appSaga()]);
}
