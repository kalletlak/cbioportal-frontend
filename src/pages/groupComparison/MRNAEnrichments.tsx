import * as React from "react";
import {observer} from "mobx-react";
import autobind from "autobind-decorator";
import {MolecularProfile} from "../../shared/api/generated/CBioPortalAPI";
import {MakeMobxView} from "../../shared/components/MobxView";
import EnrichmentsDataSetDropdown from "../resultsView/enrichments/EnrichmentsDataSetDropdown";
import LoadingIndicator from "../../shared/components/loadingIndicator/LoadingIndicator";
import ErrorMessage from "../../shared/components/ErrorMessage";
import GroupComparisonStore from "./GroupComparisonStore";
import ExpressionEnrichmentContainer from "../resultsView/enrichments/ExpressionEnrichmentsContainer";
import {MakeEnrichmentsTabUI} from "./GroupComparisonUtils";
import _ from "lodash";

export interface IMRNAEnrichmentsProps {
    store: GroupComparisonStore
}

@observer
export default class MRNAEnrichments extends React.Component<IMRNAEnrichmentsProps, {}> {
    @autobind
    private onChangeProfile(profileMap:{[studyId:string]:MolecularProfile}) {
        this.props.store.setMRNAEnrichmentProfileMap(profileMap);
    }

    readonly tabUI = MakeEnrichmentsTabUI(()=>this.props.store, ()=>this.enrichmentsUI, "mRNA");

    readonly enrichmentsUI = MakeMobxView({
        await:()=>[
            this.props.store.mRNAEnrichmentData,
            this.props.store.selectedmRNAEnrichmentProfileMap,
            this.props.store.enrichmentsGroup1,
            this.props.store.enrichmentsGroup2,
            this.props.store.studies
        ],
        render:()=>{
            const group1 = this.props.store.enrichmentsGroup1.result!;
            const group2 = this.props.store.enrichmentsGroup2.result!;
            // since mRNA enrichments tab is enabled only for one study, selectedProteinEnrichmentProfileMap
            // would contain only one key.
            const studyIds = Object.keys(this.props.store.selectedmRNAEnrichmentProfileMap.result!);
            const selectedProfile = this.props.store.selectedmRNAEnrichmentProfileMap.result![studyIds[0]];
            return (
                <div data-test="GroupComparisonMRNAEnrichments">
                    <EnrichmentsDataSetDropdown
                        dataSets={this.props.store.mRNAEnrichmentProfiles}
                        onChange={this.onChangeProfile}
                        selectedProfileByStudyId={this.props.store.selectedmRNAEnrichmentProfileMap.result!}
                        alwaysShow={true}
                        studies={this.props.store.studies.result!}
                    />
                    <ExpressionEnrichmentContainer data={this.props.store.mRNAEnrichmentData.result!}
                                                   group1Name={group1.nameWithOrdinal}
                                                   group2Name={group2.nameWithOrdinal}
                                                   group1Description={`samples in ${group1.nameWithOrdinal}.`}
                                                   group2Description={`samples in ${group2.nameWithOrdinal}.`}
                                                   group1Color={group1.color}
                                                   group2Color={group2.color}
                                                   selectedProfile={selectedProfile}
                                                   alteredVsUnalteredMode={false}
                    />
                </div>
            );
        },
        renderPending:()=><LoadingIndicator center={true} isLoading={true} size={"big"}/>,
        renderError:()=><ErrorMessage/>
    });

    render() {
        return this.tabUI.component;
    }
}