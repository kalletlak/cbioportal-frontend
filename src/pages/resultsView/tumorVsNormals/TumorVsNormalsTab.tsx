import * as React from "react";
import { action, computed, observable } from "mobx";
import { Observer, observer } from "mobx-react";
import styles from "./styles.module.scss";
import { ResultsViewPageStore } from "../ResultsViewPageStore";
import _ from "lodash";
import LoadingIndicator from "shared/components/loadingIndicator/LoadingIndicator";
import { bind } from "bind-decorator";
import { MSKTab, MSKTabs } from "../../../shared/components/MSKTabs/MSKTabs";
import { Gene } from "../../../shared/api/generated/CBioPortalAPI";
import { getMobxPromiseGroupStatus } from "../../../shared/lib/getMobxPromiseGroupStatus";
import OqlStatusBanner from "../../../shared/components/oqlStatusBanner/OqlStatusBanner";
import TumorVsNormalsViz from "./TumorVsNormalsViz";
import { TumorVsNormalsDataFilter } from "shared/api/generated/CBioPortalAPIInternal";

export interface ITumorVsNormalsTabProps {
    store: ResultsViewPageStore;
};

@observer
export default class TumorVsNormalsTab extends React.Component<ITumorVsNormalsTabProps, {}> {

    @observable _selectedHugoGeneSymbol: string | undefined; // only undefined initially, until genes downloaded

    @computed get selectedHugoGeneSymbol(): string | undefined {
        if (this._selectedHugoGeneSymbol === undefined && this.props.store.genes.isComplete &&
            this.props.store.genes.result.length > 0) {
            return this.props.store.genes.result[0].hugoGeneSymbol;
        } else {
            return this._selectedHugoGeneSymbol;
        }
    }

    @bind
    @action
    private onSelectGene(hugoGeneSymbol: string) {
        this._selectedHugoGeneSymbol = hugoGeneSymbol;
    }

    @computed get sampleSet() {
        return _.keyBy(this.props.store.samples.result!, sample => sample.studyId + sample.sampleId)
    }

    @computed get molecularProfile() {
        let moecularProfiles = _.flatten(_.values(this.props.store.normalStudySet.result))
        return moecularProfiles.length > 0 ? moecularProfiles[0] : undefined
    }

    @computed get disableLogCheckBox() {
        let normalSets = _.keys(this.props.store.normalStudySet.result)
        return normalSets[0] === 'hgu133plus2'
    }

    @computed get tumorVsNormalsDataFilter() {
        if (this.molecularProfile) {
            const dataQueryFilter = this.props.store.studyToDataQueryFilter.result![this.molecularProfile.studyId];
            if (dataQueryFilter) {
                return dataQueryFilter as TumorVsNormalsDataFilter
            }
        }
        return undefined
    }

    @bind
    private geneTabs() {
        if (this.selectedHugoGeneSymbol !== undefined) {
            const tumorVsNormalsVizElements = [];
            for (const gene of this.props.store.genes.result!) {
                if (this.molecularProfile && this.tumorVsNormalsDataFilter) {
                    tumorVsNormalsVizElements.push(
                        <TumorVsNormalsViz
                            key={`${gene.hugoGeneSymbol}`}
                            hidden={gene.hugoGeneSymbol !== this.selectedHugoGeneSymbol!}
                            gene={gene}
                            sampleSet={this.sampleSet}
                            molecularProfile={this.molecularProfile}
                            tumorVsNormalsDataFilter={this.tumorVsNormalsDataFilter}
                            disableLogCheckBox={this.disableLogCheckBox}
                        />
                    );
                }
            }

            return (
                <div>
                    <MSKTabs
                        id="coexpressionTabGeneTabs"
                        activeTabId={this.selectedHugoGeneSymbol}
                        onTabClick={this.onSelectGene}
                        className="coexpressionTabGeneTabs pillTabs"
                        unmountOnHide={true}
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
                                </MSKTab>
                            );
                        })}
                    </MSKTabs>
                    {tumorVsNormalsVizElements}
                </div>
            );
        } else {
            return (
                <LoadingIndicator isLoading={true} center={true} />
            );
        }
    }

    render() {
        let divContents = null;
        if (this.props.store.genes.isComplete &&
            this.props.store.genes.result.length > 0) {
            divContents = (
                <div>
                    <Observer>
                        {this.geneTabs}
                    </Observer>
                </div>
            );
        } else {
            divContents = (
                <div className={'alert alert-info'}>
                    There are no available profiles in the queried studies.
                </div>
            );
        }

        const status = getMobxPromiseGroupStatus(
            this.props.store.genes,
            this.props.store.molecularProfileIdToProfiledSampleCount,
            this.props.store.normalStudySet
        );

        return (
            <div data-test="coExpressionTabDiv">
                <div className={"tabMessageContainer"}>
                    <OqlStatusBanner className="coexp-oql-status-banner" store={this.props.store} tabReflectsOql={false} />
                </div>

                {(status === "complete") && divContents}

                <LoadingIndicator center={true} size={"big"} isLoading={status === "pending"} />

            </div>
        );
    }
}