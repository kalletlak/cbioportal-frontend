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

export interface IProteinEnrichmentsTabProps {
    store: ResultsViewPageStore
}

@observer
export default class ProteinEnrichmentsTab extends React.Component<IProteinEnrichmentsTabProps, {}> {

    @autobind
    private onProfileChange(profileMap:{[studyId:string]:MolecularProfile}) {
        this.props.store.setProteinEnrichmentProfile(profileMap);
    }
    
    readonly tabUI = MakeMobxView({
        await: () => [this.props.store.studies,  this.props.store.proteinEnrichmentData, this.props.store.selectedProteinEnrichmentProfileMap],
        render: () => {
            // since protein enrichments tab is enabled only for one study, selectedProteinEnrichmentProfileMap
            // would contain only one key.
            const studyIds = Object.keys(this.props.store.selectedProteinEnrichmentProfileMap.result!);
            const selectedProfile = this.props.store.selectedProteinEnrichmentProfileMap.result![studyIds[0]];
            return (
                <div>
                    <EnrichmentsDataSetDropdown
                        dataSets={this.props.store.proteinEnrichmentProfiles}
                        onChange={this.onProfileChange}
                        selectedProfileByStudyId={this.props.store.selectedProteinEnrichmentProfileMap.result!}
                        molecularProfileIdToProfiledSampleCount={this.props.store.molecularProfileIdToProfiledSampleCount}
                        studies={this.props.store.studies.result!}
                    />
                    <ExpressionEnrichmentContainer data={this.props.store.proteinEnrichmentData.result!}
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
