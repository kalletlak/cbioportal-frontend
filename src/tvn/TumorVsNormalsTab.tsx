import * as React from "react";
import { action, computed, observable } from "mobx";
import { observer } from "mobx-react";
import _ from "lodash";
import LoadingIndicator from "shared/components/loadingIndicator/LoadingIndicator";
import TumorVsNormalsViz, { NormalDataset } from "./TumorVsNormalsViz";
import { MSKTabs, MSKTab } from "shared/components/MSKTabs/MSKTabs";
import { Gene, MolecularProfile } from "shared/api/generated/CBioPortalAPI";
import autobind from "autobind-decorator";
import { remoteData } from "cbioportal-frontend-commons";
import { ResultsViewPageStore } from "pages/resultsView/ResultsViewPageStore";
import { MakeMobxView } from "shared/components/MobxView";
import ErrorMessage from "shared/components/ErrorMessage";

export interface ITumorVsNormalsTabProps {
    store: ResultsViewPageStore;
};

export type TumorVsNormalsData = {
    data: Array<TumorVsNormalsDataSampleDataObject>;
    isTumorData: boolean
    name: string
    pValue?: number
    studyId: string
};
export type TumorVsNormalsDataFilter = {
    sampleIds: Array<string>;
    sampleListId: string;
};
export type TumorVsNormalsDataSampleDataObject = {
    sampleId: string;
    studyId: string;
    value: number
};

@observer
export default class TumorVsNormalsTab extends React.Component<ITumorVsNormalsTabProps, {}> {

    @observable _selectedHugoGeneSymbol: string | undefined; // only undefined initially, until genes downloaded

    @computed get selectedHugoGeneSymbol() {
        if (this._selectedHugoGeneSymbol === undefined && this.props.store.genes.isComplete &&
            this.props.store.genes.result.length > 0) {
            return this.props.store.genes.result[0].hugoGeneSymbol;
        } else {
            return this._selectedHugoGeneSymbol!;
        }
    }

    readonly normalStudySet = remoteData({
        await: () => [this.props.store.molecularProfilesInStudies],
        invoke: () => {
            const normalStudySet = _.reduce(this.props.store.molecularProfilesInStudies.result, (acc, molecularProfile) => {
                if (molecularProfile.molecularAlterationType === "MRNA_EXPRESSION" && molecularProfile.datatype === "CONTINUOUS") {
                    if ((molecularProfile.studyId + '_mrna_U133') === molecularProfile.molecularProfileId) {
                        if (acc[NormalDataset.hgu133plus2] === undefined) {
                            acc[NormalDataset.hgu133plus2] = [molecularProfile];
                        } else {
                            acc[NormalDataset.hgu133plus2].push(molecularProfile);
                        }
                    } else if (_.includes([molecularProfile.studyId + '_rna_seq_mrna', molecularProfile.studyId + '_rna_seq_v2_mrna', molecularProfile.studyId + '_rna_seq_mrna_capture'], molecularProfile.molecularProfileId)) {
                        if (acc[NormalDataset.gtex] === undefined) {
                            acc[NormalDataset.gtex] = [molecularProfile];
                        } else {
                            acc[NormalDataset.gtex].push(molecularProfile);
                        }
                    }
                }
                return acc;
            }, {} as { [id: string]: MolecularProfile[] })

            return Promise.resolve(normalStudySet);
        },
        default: {}
    });

    @autobind
    @action
    private onSelectGene(hugoGeneSymbol: string) {
        this._selectedHugoGeneSymbol = hugoGeneSymbol;
    }

    readonly tabUI = MakeMobxView({
        await: () => [
            this.props.store.genes,
            this.props.store.molecularProfileIdToProfiledSampleCount,
            this.normalStudySet,
            this.props.store.studyIdToStudy
        ],
        render: () => {
            if (this.props.store.genes.result && this.props.store.genes.result.length > 0) {
                return (
                    <MSKTabs
                        id="coexpressionTabGeneTabs"
                        activeTabId={this.selectedHugoGeneSymbol}
                        onTabClick={this.onSelectGene}
                        className="coexpressionTabGeneTabs pillTabs"
                        unmountOnHide={false}
                        tabButtonStyle="pills"
                        enablePagination={false}
                        arrowStyle={{ 'line-height': .8 }}
                    >
                        {this.props.store.genes.result!.map((gene: Gene, i: number) => {
                            return (
                                <MSKTab
                                    key={i}
                                    id={gene.hugoGeneSymbol}
                                    linkText={gene.hugoGeneSymbol}
                                >
                                    <TumorVsNormalsViz
                                        key={`${gene.hugoGeneSymbol}`}
                                        gene={gene}
                                        samples={this.props.store.samples.result!}
                                        normalMolecularProfilesMap={this.normalStudySet.result}
                                        studyIdToStudy={this.props.store.studyIdToStudy.result}
                                    />
                                </MSKTab>
                            );
                        })}
                    </MSKTabs>
                )
            } else {
                return (
                    <div className={'alert alert-info'}>
                        There are no available profiles in the queried studies.
                </div>
                );
            }

        },
        renderPending: () => <LoadingIndicator center={true} isLoading={true} size={"big"} />,
        renderError: () => <ErrorMessage />
    });

    render() {
        return this.tabUI.component;
    }
}