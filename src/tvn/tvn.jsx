import * as React from 'react';
import TumorVsNormalsTab from "./TumorVsNormalsTab";
import ReactDOM from 'react-dom';
import { getCbioPortalApiUrl } from 'shared/api/urls';
import client from "../shared/api/cbioportalClientInstance";

const myGlobal = {};

export function  tumorVsNormalsCallBack(div, tab, url, store, autorun, isUnmount = false) {
    console.log('in tvn tumorVsNormalsCallBack')
    client.domain = getCbioPortalApiUrl();
    if (!isUnmount) {
        myGlobal.myDisposer = autorun(function () {
            if (store.studies.isComplete) {
                ReactDOM.render(<TumorVsNormalsTab store={store}></TumorVsNormalsTab>, div);
            }
        });
    } else {
        myGlobal.myDisposer();
    }
};