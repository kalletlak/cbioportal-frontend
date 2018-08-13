import * as React from 'react';
import * as _ from 'lodash';
import { observer } from "mobx-react";
import { computed } from 'mobx';
import styles from "./styles.module.scss";
import { StudyViewFilter } from 'shared/api/generated/CBioPortalAPIInternal';
import { ChartMeta } from 'pages/studyView/StudyViewPageStore';
import { isFiltered } from 'pages/studyView/StudyViewUtils';

export interface IUserSelectionsProps {
    filter: StudyViewFilter;
    attributesMetaSet: { [id: string]: ChartMeta };
    updateClinicalDataEqualityFilter: (chartMeta: ChartMeta, value: string[]) => void;
    clearGeneFilter: () => void;
    clearCNAGeneFilter: () => void;
    clearCustomCasesFilter: () => void;
    clearAllFilters: () => void
}


@observer
export default class UserSelections extends React.Component<IUserSelectionsProps, {}> {

    constructor(props: IUserSelectionsProps) {
        super(props);
    }

    @computed get showFilters() {
        return isFiltered(this.props.filter)
    }

    render() {
        if (this.showFilters) {
            return (
                <div className={styles.studyViewUserSelections}>
                    <span>Your selection:</span>
                    <div>
                        {
                            _.map((this.props.filter.clinicalDataEqualityFilters || []), clinicalDataEqualityFilter => {
                                let chartMeta = this.props.attributesMetaSet[clinicalDataEqualityFilter.clinicalDataType + '_' + clinicalDataEqualityFilter.attributeId];
                                return (
                                    <span className={styles.filter}>
                                        <span className={styles.name}>{chartMeta.clinicalAttribute.displayName}</span>
                                        {_.map(clinicalDataEqualityFilter.values, value => {
                                            return (
                                                <span className={styles.value}>
                                                    <span className={styles.label}>{value}</span>
                                                    <i className="fa fa-times" style={{ cursor: "pointer" }} onClick={event => {
                                                        this.props.updateClinicalDataEqualityFilter(chartMeta, _.filter(clinicalDataEqualityFilter.values, _value => _value !== value))
                                                    }}></i>
                                                </span>
                                            )
                                        })}

                                    </span>
                                )
                            })
                        }

                        {!_.isEmpty(this.props.filter.cnaGenes) &&
                            <span className={styles.filter}>
                                <span className={styles.name}>CNA Genes</span>
                                <i className="fa fa-times" style={{ cursor: "pointer" }} onClick={event => this.props.clearCNAGeneFilter}></i>
                            </span>
                        }

                        {!_.isEmpty(this.props.filter.mutatedGenes) &&
                            <span className={styles.filter}>
                                <span className={styles.name}>Mutated Genes</span>
                                <i className="fa fa-times" style={{ cursor: "pointer" }} onClick={event => this.props.clearGeneFilter()}></i>
                            </span>
                        }

                        {/* TODO: handle this separately for scatter plot and custom case selection box  */}
                        {!_.isEmpty(this.props.filter.sampleIdentifiers) &&
                            <span className={styles.attributeFilter}>
                                <span className={styles.name}>Mutation Count vs. CNA</span>
                                <i className="fa fa-times" style={{ cursor: "pointer" }} onClick={event => this.props.clearCustomCasesFilter()}></i>
                            </span>

                        }

                        <span><button className="btn-xs" onClick={event => this.props.clearAllFilters()}>Clear All</button></span>

                    </div>
                </div>

            )
        } else {
            return null;
        }

    }
}