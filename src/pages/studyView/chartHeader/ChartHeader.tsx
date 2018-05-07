import * as React from "react";
import "./styles.scss";
import { ClinicalAttribute } from "shared/api/generated/CBioPortalAPI";
import { observable, computed, action } from "mobx";
import _ from "lodash";
import {If} from 'react-if';
import DefaultTooltip from "../../../shared/components/defaultTooltip/DefaultTooltip";


export interface IChartHeaderProps {
    clinicalAttribute: ClinicalAttribute,
    showControls:boolean,
    showResetIcon?:boolean,
    showTableIcon?:boolean,
    showPieIcon?:boolean,
    showSurvivalIcon?:boolean
}

export class ChartHeader extends React.Component<IChartHeaderProps, {}> {

    constructor(props: IChartHeaderProps) {
        super(props);
        this.onVisibleChange = this.onVisibleChange.bind(this);
    }

    @observable
    isDownloadControlActive:boolean = false;

    private onVisibleChange = (visible:boolean) => {
        this.isDownloadControlActive=visible
    }

    @computed
    private get showChartControls(){
        return this.props.showControls||this.isDownloadControlActive;
    }

    public render() {
        return (
            <main>
                <section><span>{this.props.clinicalAttribute.displayName}</span></section>
                <aside>
                    <If condition={this.showChartControls}>
                        <div role="group" className="btn-group study-view-chart-contorls">
                            <If condition={this.props.showResetIcon}>
                                <button className="btn btn-xs">
                                    <i className="fa fa-undo" aria-hidden="true" title="Reset filters in chart"></i>
                                </button>
                            </If>
                            <button className="btn btn-xs" >
                                <i className="fa fa-info-circle" aria-hidden="true" title={this.props.clinicalAttribute.description}></i>
                            </button>
                            <If condition={this.props.showTableIcon}>
                                <button className="btn btn-xs">
                                    <i className="fa fa-table" aria-hidden="true" title="Convert pie chart to table"></i>
                                </button>
                            </If>
                            <If condition={this.props.showPieIcon}>
                                <button className="btn btn-xs">
                                    <i className="fa fa-pie-chart" aria-hidden="true" title="Convert table to pie chart"></i>
                                </button>
                            </If>
                            <If condition={this.props.showSurvivalIcon}>
                                <button className="btn btn-xs">
                                    <i className="fa fa-line-chart" aria-hidden="true" title="Survival Analysis"></i>
                                </button>
                            </If>
                            <button className="btn btn-xs">
                                <DefaultTooltip
                                    placement="bottom"
                                    onVisibleChange={this.onVisibleChange}
                                    trigger={['hover', 'focus','click']}
                                    overlay={<div role="group" className="btn-group download-button">
                                                <button className="btn btn-xs">
                                                DATA
                                                </button>
                                                <button className="btn btn-xs" >
                                                PDF
                                                </button>
                                                <button className="btn btn-xs">
                                                SVG
                                                </button>
                                            </div>}
                                    arrowContent={<div className="rc-tooltip-arrow-inner" />}
                                    destroyTooltipOnHide={true}
                                >
                                    <i className="fa fa-download" aria-hidden="true" title="Download"></i>
                                </DefaultTooltip>
                            </button>
                            <button className="btn btn-xs">
                                <i className="fa fa-arrows" aria-hidden="true" title="Move chart"></i>
                            </button>
                            <button className="btn btn-xs">
                            <i className="fa fa-times" aria-hidden="true" title="Delete chart"></i>
                            </button>
                        </div>
                    </If>
                </aside>
            </main>
        )
    }

}