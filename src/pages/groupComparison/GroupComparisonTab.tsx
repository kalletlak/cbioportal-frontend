import * as React from "react";
import {observer} from "mobx-react";
import {ResultsViewPageStore} from "../resultsView/ResultsViewPageStore";
import GroupComparisonStore from "./GroupComparisonStore";
import { MSKTabs, MSKTab } from 'shared/components/MSKTabs/MSKTabs';
import { observable, computed } from 'mobx';
import autobind from 'autobind-decorator';
import Survival from "./Survival";

export interface IGroupComparisonTabProps {
    store:GroupComparisonStore;
}

@observer
export default class GroupComparisonTab extends React.Component<IGroupComparisonTabProps, {}> {

    @observable currentTabId:string;

    @autobind
    private handleTabChange(id: string) {
            this.currentTabId = id;
    }


    render() {
        return (
            <div data-test="groupComparisonTabDiv">
                <MSKTabs activeTabId={this.currentTabId} onTabClick={this.handleTabChange} className="secondaryTabs">
                    {this.props.store.showSurvivalTab && <MSKTab id="survival" linkText="survival">
                        <Survival store={this.props.store}/>
                    </MSKTab>}
                </MSKTabs>
            </div>
        );
    }
}