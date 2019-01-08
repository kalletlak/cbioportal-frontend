import * as React from "react";
import { action, computed, observable } from "mobx";
import { Observer, observer } from "mobx-react";
import _ from "lodash";
import { Checkbox, FormControl } from 'react-bootstrap';
import autobind from "autobind-decorator";
import "./styles.scss";
import { Gene, MolecularProfile } from "shared/api/generated/CBioPortalAPI";
import { remoteData } from "shared/api/remoteData";
import { TumorVsNormalsData, Sample, TumorVsNormalsDataFilter } from "shared/api/generated/CBioPortalAPIInternal";
import LoadingIndicator from "shared/components/loadingIndicator/LoadingIndicator";
import BoxScatterPlot, { IBoxScatterPlotData } from "shared/components/plots/BoxScatterPlot";
import { IBoxScatterPlotPoint, makeBoxScatterPlotData, IStringAxisData, INumberAxisData, boxPlotTooltip } from "../plots/PlotsTabUtils";
import { scatterPlotSize } from "shared/components/plots/PlotUtils";
import DownloadControls from "shared/components/downloadControls/DownloadControls";
import internalClient from "shared/api/cbioportalInternalClientInstance";
const CheckedSelect = require("react-select-checked").CheckedSelect;
import { VictoryLine, VictoryLabel } from "victory";
import jStat from 'jStat';
import { WindowWidthBox } from "shared/components/WindowWidthBox/WindowWidthBox";

export interface ITumorVsNormalsVizProps {
    hidden?: boolean;
    gene: Gene;
    sampleSet: { [id: string]: Sample },
    molecularProfile: MolecularProfile
    tumorVsNormalsDataFilter: TumorVsNormalsDataFilter
    disableLogCheckBox?: boolean
};

class TVNTabBoxPlot extends BoxScatterPlot<IBoxScatterPlotPoint> { }


@observer
export default class TumorVsNormalsViz extends React.Component<ITumorVsNormalsVizProps, {}> {

    @observable private zScore = false;
    @observable private logScale = false;
    @observable private threshold: number = 0.01;

    @observable private selectedIds: string[] = [];
    @observable private alwaysVisibleIds: string[] = [];

    @computed get dataAlreadyLogged() {
        return this.zScore || this.props.disableLogCheckBox
    }

    @autobind
    @action
    private handlezScoreChange() {
        this.zScore = !this.zScore;
    }

    @autobind
    @action
    private handleLogScaleChange() {
        this.logScale = !this.logScale;
    }

    @autobind
    @action
    private handleThresholdChange(e: any) {
        this.threshold = e.target.value;
    }

    readonly plotData = remoteData<TumorVsNormalsData[]>({
        invoke: () => {
            if (this.props.hidden) {
                // dont download any data or trigger anything if element is hidden
                return Promise.resolve([]);
            }

            return internalClient.fetchTumorVsNormalsDataUsingPOST({
                molecularProfileId: this.props.molecularProfile.molecularProfileId,
                tumorVsNormalsDataFilter: this.props.tumorVsNormalsDataFilter,
                entrezGeneId: this.props.gene.entrezGeneId,
                zScore: this.zScore
            })
        },
        default: [],
        onResult: (data) => {
            this.logScale = false
        }
    });

    @computed get controls() {
        return (
            <div className="axisBlock tumor-vs-normals--form-controls">
                <table>
                    <tr>
                        <td>
                            <Checkbox checked={this.zScore} onChange={this.handlezScoreChange} inline>
                                Apply Z-Score
                            </Checkbox>
                        </td>
                    </tr>
                    <tr>
                        <td colSpan={2}>
                            <div style={{ display: "flex", alignItems: "center" }} >
                                <span style={{ marginRight: '5px' }}>Threshold</span>
                                <FormControl
                                    type="number"
                                    value={this.threshold}
                                    onChange={this.handleThresholdChange}
                                    placeholder="Threshold"
                                />
                            </div>
                        </td>
                    </tr>
                </table>
            </div>)
    }

    @computed get onChangeMultiple() {
        return (values: { value: string }[]) => {
            this.selectedIds = _.uniq([...values.map(o => o.value), ...this.alwaysVisibleIds])
        };
    }

    readonly options = remoteData<{ label: string, value: string, disabled?: boolean }[]>({
        await: () => [this.plotData],
        invoke: () => {
            let options: { label: string, value: string, disabled?: boolean }[] = [];

            this.plotData.result.forEach(obj => {
                let newOption: { label: string, value: string, disabled?: boolean } = { label: obj.name, value: obj.name }
                if (obj.isTumorData) {
                    newOption.disabled = true
                }
                options.push(newOption);
            })
            return Promise.resolve(options);
        },
        default: [],
        onResult: (data) => {
            this.selectedIds = data.map(x => x.value)
            this.alwaysVisibleIds = _.filter(data, obj => obj.disabled).map(x => x.value)
        }
    });

    @computed get value() {
        return this.selectedIds.map(x => ({ value: x }));
    }

    @computed get filters() {
        return (
            <div className="axisBlock tissue-track-selector">
                <CheckedSelect
                    name='Add tissues'
                    placeholder='Add tissues'
                    onChange={this.onChangeMultiple}
                    options={this.options.result}
                    value={this.value}
                    labelKey="label"
                    disabled={this.options.isPending || this.options.isError || this.options.result.length === 0}
                />
            </div>
        )
    }

    readonly boxPlotData = remoteData<{ horizontal: boolean, data: IBoxScatterPlotData<IBoxScatterPlotPoint>[] }>({
        await: () => [
            this.options,
        ],
        invoke: () => {

            let categoryData: IStringAxisData = {
                data: [],
                datatype: 'string'
            } as any;
            let numberData: INumberAxisData = {
                data: [],
                datatype: 'number'
            } as any

            let sampleSet: { [id: string]: Sample } = {}

            this.selectedIds

            _.each(this.plotData.result!, data => {
                if (_.includes(this.selectedIds, data.name)) {
                    if (data.isTumorData) {
                        data.data.forEach(sampleObj => {
                            let sample = this.props.sampleSet[data.studyId + sampleObj.sampleId];
                            sampleSet[sample.uniqueSampleKey] = sample;
                            categoryData.data.push({
                                uniqueSampleKey: sample.uniqueSampleKey,
                                value: data.name
                            })
                            numberData.data.push({
                                uniqueSampleKey: sample.uniqueSampleKey,
                                value: sampleObj.value
                            })
                        })
                    } else {
                        data.data.forEach(sampleObj => {
                            sampleSet[sampleObj.sampleId] = {
                                sampleId: sampleSet[sampleObj.sampleId],
                                studyId: data.name
                            } as any
                            categoryData.data.push({
                                uniqueSampleKey: sampleObj.sampleId,
                                value: `${data.name} (${data.pValue.toExponential(1)})`
                            })
                            numberData.data.push({
                                uniqueSampleKey: sampleObj.sampleId,
                                value: sampleObj.value
                            })
                        })

                    }
                }

            })

            return Promise.resolve({
                horizontal: false,
                data: makeBoxScatterPlotData(
                    categoryData, numberData,
                    sampleSet,
                    {},
                    undefined,
                    undefined
                )
            });
        },
        default: {
            data: [],
            horizontal: false
        }
    });

    @observable plotExists = false;

    @autobind
    private getSvg() {
        return document.getElementById('tvn-tab-plot-svg') as SVGElement | null;
    }

    @computed get median() {
        let filteredPlotData = _.filter(this.plotData.result!, data => data.isTumorData);
        if (filteredPlotData.length === 1) {
            const vector = filteredPlotData[0].data.map(obj => (!this.props.disableLogCheckBox && this.logScale) ? Math.log2(Math.max(obj.value, 0.01)) : obj.value)
            const sortedVector = _.sortBy<number>(vector, [(n: number) => n]);
            return (jStat.median(sortedVector) as number).toFixed(2);
        }
        return undefined;
    }

    componentDidUpdate() {
        this.plotExists = !!this.getSvg();
    }

    private downloadFilename = "tumor-vs-normals";

    /*
 * if we have more than threshold of bars (groups) we need to do horizontal scrolling
 */
    get overflowStyle(): React.CSSProperties {
        return {
            position: 'relative',
            display: 'inline-block',
            width: '100%'
        };
    }
    @computed get tissuePValueSet() {
        return _.chain(this.plotData.result)
            .filter(obj => obj.pValue !== undefined)
            .keyBy(tissue => {
                let pValue = tissue.pValue ? ` (${tissue.pValue.toExponential(1)})` : ''
                return `${tissue.name}${pValue}`
            })
            .mapValues(obj => obj.pValue)
            .value();

    }


    @computed get boxPlotAppearance() {
        let threshold = this.threshold
        return function (d: any) {
            return !this.tissuePValueSet[d] || this.tissuePValueSet[d] > threshold ? {
                min: { stroke: "#AAAAAA" },
                max: { stroke: "#AAAAAA" },
                q1: { fill: "#eeeeee", stroke: "#AAAAAA" },
                q3: { fill: "#eeeeee", stroke: "#AAAAAA" },
                median: { stroke: "#AAAAAA", strokeWidth: 1 },
            } : {
                    min: { stroke: "#F80000" },
                    max: { stroke: "#F80000" },
                    q1: { fill: "#eeeeee", stroke: "#F80000" },
                    q3: { fill: "#eeeeee", stroke: "#F80000" },
                    median: { stroke: "#F80000", strokeWidth: 1 },
                }
        };
    }


    @autobind
    private boxStyle(d: any) {
        return this.boxPlotAppearance(d);
    }

    @computed get boxPlotTooltip() {
        return (d: IBoxScatterPlotPoint) => {
            let content;
            if (this.boxPlotData.isComplete) {
                if (d.sampleId) {
                    content = boxPlotTooltip(d, this.boxPlotData.result.horizontal);

                } else {
                    content = <div>
                        <div>Sample: <span style={{ fontWeight: "bold" }}>{d.uniqueSampleKey as any}</span></div>
                        <div>Horizontal(Tissue): <span style={{ fontWeight: "bold" }}>{d.studyId as any}</span></div>
                        <div>Vertical: <span style={{ fontWeight: "bold" }}>{d.value as any}</span></div>
                    </div>;
                }

            } else {
                content = <span>Loading... (this shouldnt appear because the box plot shouldnt be visible)</span>;
            }
            return content;
        }
    }

    @computed private get plot() {
        if (this.boxPlotData.isPending) {
            return <LoadingIndicator isLoading={true} center={true} size={"big"} />
        }
        if (this.boxPlotData.isError) {
            return <span>Error fetching data. Please refresh the page and try again.</span>
        } else {
            return (
                <div style={this.overflowStyle} className="borderedChart">
                    <Observer>
                        {this.toolbar}
                    </Observer>
                    <div style={{ overflowX: 'auto', overflowY: 'hidden', position: "relative" }}>
                        <TVNTabBoxPlot
                            svgId='tvn-tab-plot-svg'
                            domainPadding={75}
                            boxWidth={20}
                            axisLabelX={'Tissue Type'}
                            axisLabelY={`${this.props.gene.hugoGeneSymbol}, Gene Expression Value${this.logScale ? '(Log2)' : ''}`}
                            data={this.boxPlotData.result!.data}
                            chartBase={600}
                            logScale={!this.props.disableLogCheckBox && !this.zScore && this.logScale}
                            tooltip={this.boxPlotTooltip}
                            horizontal={false}
                            size={scatterPlotSize}
                            boxStyle={this.boxStyle}
                            symbol="circle"
                            useLogSpaceTicks={true}
                            legendData={[{
                                name: '<= threshold',
                                symbol: {
                                    fill: '#AAAAAA',
                                    type: "minus"
                                }
                            }, {
                                name: '> threshold',
                                symbol: {
                                    fill: '#F80000',
                                    type: "minus"
                                }
                            }]}
                            legendLocationWidthThreshold={550}
                            title={`Tumor vs. Normals ${this.props.gene.hugoGeneSymbol}, Gene Expression ${this.zScore ? 'Z-score ' : ''}comparison`}
                        >
                            {this.median &&
                                <VictoryLine
                                    style={{
                                        data: { stroke: "#c43a31" },
                                        parent: { border: "1px solid #ccc" }
                                    }}
                                    y={(d: any) => this.median}
                                />}
                            <VictoryLabel
                                text={`Median: ${this.median}`}
                                x={91}
                                y={65}
                                style={{ fontSize: 12, fontFamily: "Arial, Helvetica" }} />
                        </TVNTabBoxPlot>
                    </div>
                </div>
            )
        }
    }

    @autobind private toolbar() {
        return (
            <div style={{ textAlign: "center", position: "relative" }}>
                {!this.dataAlreadyLogged && <div style={{ display: "inline-block" }}>
                    <Checkbox checked={this.logScale} onChange={this.handleLogScaleChange} inline>
                        Log Scale
                    </Checkbox>
                </div>}

                <DownloadControls
                    getSvg={this.getSvg}
                    filename={this.downloadFilename}
                    dontFade={true}
                    collapse={true}
                    style={{ position: "absolute", top: 0, right: 0 }}
                />

            </div>
        );
    }


    render() {
        let innerElt = (
            <div>
                <div className={"tvnTab"} style={{ display: "flex", flexDirection: "row" }}>
                    <div className="leftColumn">
                        {this.controls}
                        {this.filters}
                    </div>
                    <WindowWidthBox offset={360}>
                        {this.plot}
                    </WindowWidthBox>
                </div>
            </div>
        )
        return (
            <div style={{ display: this.props.hidden ? "none" : "inherit", minHeight: 826, position: "relative" }}>
                {innerElt}
            </div>
        );
    }
}