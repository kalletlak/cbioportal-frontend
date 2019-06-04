import * as React from "react";
import {observer} from "mobx-react";
import autobind from "autobind-decorator";
import {MolecularProfile} from "../../shared/api/generated/CBioPortalAPI";
import {MakeMobxView} from "../../shared/components/MobxView";
import EnrichmentsDataSetDropdown from "../resultsView/enrichments/EnrichmentsDataSetDropdown";
import ExpressionEnrichmentContainer from "../resultsView/enrichments/ExpressionEnrichmentsContainer";
import Loader from "../../shared/components/loadingIndicator/LoadingIndicator";
import ErrorMessage from "../../shared/components/ErrorMessage";
import GroupComparisonStore from "./GroupComparisonStore";
import {MakeEnrichmentsTabUI} from "./GroupComparisonUtils";
import _ from "lodash";

export interface IProteinEnrichmentsProps {
    store: GroupComparisonStore
}

@observer
export default class ProteinEnrichments extends React.Component<IProteinEnrichmentsProps, {}> {
    @autobind
    private onChangeProfile(profileMap:{[studyId:string]:MolecularProfile}) {
        this.props.store.setProteinEnrichmentProfileMap(profileMap);
    }

    readonly tabUI = MakeEnrichmentsTabUI(()=>this.props.store, ()=>this.enrichmentsUI, "protein");

    readonly enrichmentsUI = MakeMobxView({
        await:()=>[
            this.props.store.proteinEnrichmentData,
            this.props.store.selectedProteinEnrichmentProfileMap,
            this.props.store.enrichmentsGroup1,
            this.props.store.enrichmentsGroup2,
            this.props.store.studies
        ],
        render:()=>{
            const group1 = this.props.store.enrichmentsGroup1.result!;
            const group2 = this.props.store.enrichmentsGroup2.result!;
            // since protein enrichments tab is enabled only for one study, selectedProteinEnrichmentProfileMap
            // would contain only one key.
            const studyIds = Object.keys(this.props.store.selectedProteinEnrichmentProfileMap.result!);
            const selectedProfile = this.props.store.selectedProteinEnrichmentProfileMap.result![studyIds[0]];
            return (
                <div data-test="GroupComparisonProteinEnrichments">
                    <EnrichmentsDataSetDropdown
                        dataSets={this.props.store.proteinEnrichmentProfiles}
                        onChange={this.onChangeProfile}
                        selectedProfileByStudyId={this.props.store.selectedProteinEnrichmentProfileMap.result!}
                        alwaysShow={true}
                        studies={this.props.store.studies.result!}
                    />
                    <ExpressionEnrichmentContainer data={this.props.store.proteinEnrichmentData.result!}
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
        renderPending:()=><Loader center={true} isLoading={true} size={"big"}/>,
        renderError:()=><ErrorMessage/>
    });

    render() {
        return this.tabUI.component;
    }
}