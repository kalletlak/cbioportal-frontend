import * as React from 'react';
import { observer } from "mobx-react";
import {ResultsViewPageStore} from "../ResultsViewPageStore";
import ExpressionEnrichmentContainer from 'pages/resultsView/enrichments/ExpressionEnrichmentsContainer';
import Loader from 'shared/components/loadingIndicator/LoadingIndicator';
import EnrichmentsDataSetDropdown from 'pages/resultsView/enrichments/EnrichmentsDataSetDropdown';
import { MolecularProfile } from 'shared/api/generated/CBioPortalAPI';
import autobind from 'autobind-decorator';
import ErrorMessage from "../../../shared/components/ErrorMessage";
import _ from "lodash";
import { MakeMobxView } from 'shared/components/MobxView';

export interface IMRNAEnrichmentsTabProps {
    store: ResultsViewPageStore
}

@observer
export default class MRNAEnrichmentsTab extends React.Component<IMRNAEnrichmentsTabProps, {}> {

    @autobind
    private onChangeProfile(profileMap:{[studyId:string]:MolecularProfile}) {
        this.props.store.setmRNAEnrichmentProfile(profileMap);
    }

    readonly tabUI = MakeMobxView({
        await: () => [this.props.store.studies,  this.props.store.mRNAEnrichmentData, this.props.store.selectedmRNAEnrichmentProfileMap],
        render: () => {
            // since mRNA enrichments tab is enabled only for one study, selectedProteinEnrichmentProfileMap
            // would contain only one key.
            const studyIds = Object.keys(this.props.store.selectedmRNAEnrichmentProfileMap.result!);
            const selectedProfile = this.props.store.selectedmRNAEnrichmentProfileMap.result![studyIds[0]];
            return (
                <div data-test="MRNAEnrichmentsTab">
                    <EnrichmentsDataSetDropdown
                        dataSets={this.props.store.mRNAEnrichmentProfiles}
                        onChange={this.onChangeProfile}
                        selectedProfileByStudyId={this.props.store.selectedmRNAEnrichmentProfileMap.result!}
                        molecularProfileIdToProfiledSampleCount={this.props.store.molecularProfileIdToProfiledSampleCount}
                        studies={this.props.store.studies.result!}
                    />
                    <ExpressionEnrichmentContainer data={this.props.store.mRNAEnrichmentData.result!}
                        selectedProfile={selectedProfile} store={this.props.store} />
                </div>
            );
        },
        renderPending: () => <Loader isLoading={true} center={true} size={"big"}/>,
        renderError: ()=> <ErrorMessage/>
    });

    public render() {
        return this.tabUI.component;
    }
}
