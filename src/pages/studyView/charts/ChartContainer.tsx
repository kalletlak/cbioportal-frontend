import * as React from "react";
import styles from "./styles.module.scss";
import { observer } from "mobx-react";
import { ClinicalAttribute } from "shared/api/generated/CBioPortalAPI";
import { observable, computed, action } from "mobx";
import _ from "lodash";
import {If} from 'react-if';
import { ChartHeader } from "pages/studyView/chartHeader/ChartHeader";
import { ClinicalDataType, StudyViewPageStore } from "pages/studyView/StudyViewPageStore";
import fileDownload from 'react-file-download';
import PieChart from "pages/studyView/charts/pieChart/PieChart";
import svgToPdfDownload from "shared/lib/svgToPdfDownload";
import { ClinicalDataCount, StudyViewFilter } from "shared/api/generated/CBioPortalAPIInternal";
import { remoteData } from "shared/api/remoteData";
import internalClient from "shared/api/cbioportalInternalClientInstance";
import MobxPromise from "mobxpromise";
import classnames from 'classnames';
import { bind } from "bind-decorator";

export interface AbstractChart {
    downloadData:()=>string;
    toSVGDOMNode:()=>Element
}

export enum ChartType {
    PIE_CHART='PIE_CHART',
    BAR_CHART='BAR_CHART',
    SURVIVAL='SURVIVAL',
    TABLE='TABLE',
    SCATTER='SCATTER'
}

export interface IChartContainerProps {
    chartType        : ChartType;
    clinicalAttribute: ClinicalAttribute;
    promise          : MobxPromise<ClinicalDataCount[]>;
    filters          : string[];
    onUserSelection  : (attrId: string, clinicalDataType: ClinicalDataType, value: string[]) => void;
    onDeleteChart    : (attrId:string) => void;
}

@observer
export class ChartContainer extends React.Component<IChartContainerProps, {}> {

    private handlers:any;
    private plot:AbstractChart;

    @observable mouseInPlot:boolean = false;
    @observable placement:'left'|'right' = 'right';
    
    constructor(props: IChartContainerProps) {
        super(props);
        let fileName = props.clinicalAttribute.displayName.replace(/[ \t]/g,'_')
        let clinicalDataType = this.props.clinicalAttribute.patientAttribute ? ClinicalDataType.PATIENT : ClinicalDataType.SAMPLE;

        this.handlers = {
            ref: (plot:AbstractChart)=>{ 
                this.plot = plot; 
            },
            resetFilters: action(()=>{
                this.props.onUserSelection(
                    this.props.clinicalAttribute.clinicalAttributeId,
                    clinicalDataType,
                    []);
            }),
            onUserSelection: action((values:string[])=>{
                this.props.onUserSelection(
                    this.props.clinicalAttribute.clinicalAttributeId,
                    clinicalDataType,
                    values);
            }),
            onMouseEnterPlot:action((event:React.MouseEvent<any>)=> {
                this.placement = event.nativeEvent.x>800 ? 'left' : 'right';
                this.mouseInPlot = true;
            }),
            onMouseLeavePlot: action(()=>{ 
                this.placement = 'right'
                this.mouseInPlot = false;
            }),
            handleDownloadDataClick:()=>{
                let firstLine = this.props.clinicalAttribute.displayName+'\tCount'
                fileDownload(firstLine+'\n'+this.plot.downloadData(), fileName);
            },
            handleSVGClick:()=>{
                fileDownload((new XMLSerializer()).serializeToString(this.toSVGDOMNode()), `${fileName}.svg`);
            },
            handlePDFClick:()=>{
                svgToPdfDownload(`${fileName}.pdf`, this.toSVGDOMNode());
            },
            onDeleteChart:()=>{
                this.props.onDeleteChart(this.props.clinicalAttribute.clinicalAttributeId);
            }
        };
    }

    public toSVGDOMNode():Element {
        if (this.plot) {
            // Get result of plot
            return this.plot.toSVGDOMNode();
        } else {
            return document.createElementNS("http://www.w3.org/2000/svg", "svg");
        }
    }

    @computed get showPieControlIcon(){
        return this.props.clinicalAttribute.datatype==='STRING' && this.props.chartType === ChartType.TABLE;
    }

    @computed get showTableControlIcon(){
        return this.props.chartType === ChartType.PIE_CHART && this.props.clinicalAttribute.datatype==='STRING';
    }

    @computed get isChartVisible(){
        //check if there is chart implementation is present
        return this.props.chartType === ChartType.PIE_CHART && this.props.clinicalAttribute.datatype==='STRING';
    }

    @computed get data(){
        return this.props.promise.result || [];
    }

    @computed get chartStyle(){
        return this.props.chartType === ChartType.PIE_CHART ? [styles.chartHeightOne, styles.chartWidthOne] : [styles.chartHeightTwo, styles.chartWidthTwo];
    }

    public render() {
        
        return (
            <If condition={this.isChartVisible}>
                <div className={ classnames(styles.chart, ...this.chartStyle) }
                     onMouseEnter={this.handlers.onMouseEnterPlot}
                     onMouseLeave={this.handlers.onMouseLeavePlot}>
                    <ChartHeader 
                        clinicalAttribute={this.props.clinicalAttribute}
                        showControls={this.mouseInPlot}
                        showResetIcon={this.props.filters.length>0}
                        handleResetClick={this.handlers.resetFilters}
                        onDeleteChart={this.handlers.onDeleteChart}
                    />

                    <If condition={this.props.chartType===ChartType.PIE_CHART}>
                        <PieChart
                            ref={this.handlers.ref}
                            onUserSelection={this.handlers.onUserSelection}
                            filters={this.props.filters}
                            data={this.data}
                            active={this.mouseInPlot} 
                            placement={this.placement}/>
                    </If>
                </div>
            </If>
        );
    }
}
