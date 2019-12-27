import { ICustomTabConfiguration } from "shared/model/ITabConfiguration";
import { autorun } from "mobx";
import TumorVsNormalsTab from "./TumorVsNormalsTab";
import ReactDOM from 'react-dom';

const myGlobal: any = {};

export function tumorVsNormalsCallBack(div: HTMLDivElement, tab: ICustomTabConfiguration, url: string, store: any, autorun1:any, isUnmount = false) {
    if (!isUnmount) {
        myGlobal.myDisposer = autorun(function () {
            if (store.studies.isComplete) {
                //ReactDOM.render(<div>{store.studies.result}</div>, div);

                 ReactDOM.render(<TumorVsNormalsTab store={store}></TumorVsNormalsTab>, div);
            }
        });
    } else {
        myGlobal.myDisposer();
    }
}