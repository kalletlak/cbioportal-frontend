import * as React from 'react';
import * as _ from 'lodash';
import { Sample } from 'shared/api/generated/CBioPortalAPIInternal';
import { observer } from "mobx-react";
import { computed, observable, action } from 'mobx';
import "./styles.scss";
import { bind } from 'bind-decorator';
import { buildCBioPortalUrl } from 'shared/api/urls';
import CustomCaseSelection from 'pages/studyView/customCaseSelection/CustomCaseSelection';

export interface ISummaryHeaderProps {
    selectedSamples: Sample[];
}

@observer
export default class SummaryHeader extends React.Component<ISummaryHeaderProps, {}> {

    @computed
    get selectedPatientsCount() {
        return _.uniq(this.props.selectedSamples.map(sample => sample.uniquePatientKey)).length;
    }

    @bind
    private openCases() {

        const firstSample = this.props.selectedSamples[0];
        const groupedSamples = _.groupBy(this.props.selectedSamples, sample => sample.studyId);
        const IncludeStudyId: boolean = Object.keys(groupedSamples).length > 1;

        let navCaseIds = _.map(groupedSamples, (samples) => {
            return _.map(samples, sample => {
                let returnString = '';
                if (IncludeStudyId) {
                    returnString += sample.studyId + ':';
                }
                returnString += sample.patientId;
                return returnString;
            }).join(',');
        }).join(',');

        //TODO: handle browser url length limitation
        //TODO: somehow this is not working
        //window.open(buildCBioPortalUrl('patient', { sampleId:firstSample.sampleId, studyId:firstSample.studyId ,navCaseIds : navCaseIds}));

        window.open(buildCBioPortalUrl('case.do', {
            sampleId: firstSample.sampleId,
            studyId: firstSample.studyId,
            navCaseIds: navCaseIds
        }));
    }


    @observable private isCustomCaseBoxOpen = false;

    @bind
    @action
    private toggleCustomCaseSelection() {
        if (this.isCustomCaseBoxOpen) {
            this.isCustomCaseBoxOpen = false;
        } else {
            this.isCustomCaseBoxOpen = true;
        }
    }

    render() {
        return (
            <div className="studyview-summary-header">
                {
                    (this.isCustomCaseBoxOpen) && (
                        <CustomCaseSelection
                            selectedSamples={this.props.selectedSamples}
                            onClose={()=>this.isCustomCaseBoxOpen = false}
                            onSubmit={()=>null}/>
                    )
                }
                <div>
                    <span>Selected:</span>
                    <span className="content">{this.props.selectedSamples.length} samples / {this.selectedPatientsCount} patients</span>
                    <button className="btn" onClick={() => null}>
                        <i className="fa fa-bookmark" aria-hidden="true" title="Virtual Study"></i>
                    </button>
                    <button className="btn" onClick={() => this.openCases()}>
                        <i className="fa fa-user-circle-o" aria-hidden="true" title="View selected cases"></i>
                    </button>
                    <button className="btn" onClick={() => null}>
                        <i className="fa fa-download" aria-hidden="true" title="Download clinical data for selected cases"></i>
                    </button>
                    <button
                        className="btn btn-default btn-sm"
                        onClick={event=>this.isCustomCaseBoxOpen = true}
                    >
                        Select cases
                    </button>
                </div>
            </div>
        )
    }


}