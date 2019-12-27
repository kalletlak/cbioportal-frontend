import * as React from "react";
import { action, computed, observable } from "mobx";
import { Observer, observer } from "mobx-react";
import _ from "lodash";
import { Checkbox, FormControl } from 'react-bootstrap';
import autobind from "autobind-decorator";
import "./styles.scss";
import { Gene, MolecularProfile, Sample, MolecularDataMultipleStudyFilter, CancerStudy } from "shared/api/generated/CBioPortalAPI";
import LoadingIndicator from "shared/components/loadingIndicator/LoadingIndicator";
import BoxScatterPlot, { IBoxScatterPlotData } from "shared/components/plots/BoxScatterPlot";
import { scatterPlotSize } from "shared/components/plots/PlotUtils";
import { VictoryLine, VictoryLabel } from "victory";
import jStat from 'jStat';
import { WindowWidthBox } from "shared/components/WindowWidthBox/WindowWidthBox";
import { TumorVsNormalsData } from "./TumorVsNormalsTab";
import { IBoxScatterPlotPoint, IStringAxisData, INumberAxisData, makeBoxScatterPlotData, boxPlotTooltip, IAxisLogScaleParams } from "pages/resultsView/plots/PlotsTabUtils";
import { remoteData, CheckedSelect, DownloadControls } from "cbioportal-frontend-commons";
import request from "superagent";
import { MakeMobxView } from "shared/components/MobxView";
import ErrorMessage from "shared/components/ErrorMessage";
import client from "shared/api/cbioportalClientInstance";
var ttest = require('ttest');
import Select from "react-select1";

export interface ITumorVsNormalsVizProps {
    gene: Gene;
    samples: Sample[],
    normalMolecularProfilesMap: { [id: string]: MolecularProfile[] }
    studyIdToStudy: { [id: string]: Pick<CancerStudy, "name"> }
};

export enum NormalDataset {
    gtex = "gtex",
    hgu133plus2 = "hgu133plus2"
}

export const NormlaDataset: { [id: string]: string } = {
    gtex: "GTEx",
    hgu133plus2: "Human Genome U133 Plus 2.0 "
};


type NormalData = {
    reference: string;
    hugoGeneSymbol: string;
    data: {
        sampleId: string;
        tissue: string;
        value: number;
    }[]
};

class TVNTabBoxPlot extends BoxScatterPlot<IBoxScatterPlotPoint> { }


@observer
export default class TumorVsNormalsViz extends React.Component<ITumorVsNormalsVizProps, {}> {

    @observable private zScore = false;
    @observable private logScale = false;
    @observable private threshold: number = 0.01;
    @observable logScaleFunction: IAxisLogScaleParams | undefined;
    @observable private selectedIds: string[] = [];
    @observable private alwaysVisibleIds: string[] = [];
    @observable private _normalDataset: NormalDataset;
    private downloadFilename = "tumor-vs-normals";

    @observable plotExists = false;

    @autobind
    private getSvg() {
        return document.getElementById('tvn-tab-plot-svg') as SVGElement | null;
    }
    componentDidUpdate() {
        this.plotExists = !!this.getSvg();
    }

    @computed get selectedNormalDataset() {
        return this._normalDataset || this.normalDataSetOptions[0].value;
    }

    @computed get dataAlreadyLogged() {
        return this.zScore || this.isTumorDataAlreadyInLogValues;
    }

    @autobind
    @action
    private handlezScoreChange() {
        this.zScore = !this.zScore;
        if (!this.zScore) {
            this.logScale = false;
        }
    }

    @autobind
    @action
    private handleLogScaleChange() {
        this.logScale = !this.logScale;
        if (this.logScale) {
            const MIN_LOG_ARGUMENT = 0.01;
            this.logScaleFunction = {
                label: "log2",
                fLogScale: (x: number, offset: number) => Math.log2(Math.max(x, MIN_LOG_ARGUMENT)),
                fInvLogScale: (x: number) => Math.pow(2, x)
            };
        } else {
            this.logScaleFunction = undefined;
        }
    }

    @autobind
    @action
    private handleThresholdChange(e: any) {
        this.threshold = e.target.value;
    }

    @autobind
    @action
    private handleNormalDatasetChange(e: any) {
        this._normalDataset = e.value;
    }

    readonly normalTissueData = remoteData<TumorVsNormalsData[]>({
        invoke: async () => {

            const url = `http://localhost:8082/api/reference/${this.selectedNormalDataset}/gene/${this.props.gene.hugoGeneSymbol}`

            const resp = await request.get(url);
            const parsedResp: NormalData = JSON.parse(resp.text);

            return _.chain(parsedResp.data)
                .groupBy(datum => datum.tissue)
                .reduce((acc, next, tissue) => {
                    if (next.length > 1) {
                        acc.push({
                            data: next.map(datum => {
                                return {
                                    sampleId: datum.sampleId,
                                    value: this.isTumorDataAlreadyInLogValues ? Math.log1p(datum.value) / Math.log(2) : datum.value
                                }
                            }),
                            isTumorData: false,
                            name: tissue,
                        } as any);
                    }
                    return acc;
                }, [] as TumorVsNormalsData[])
                .sortBy(datum => datum.name)
                .value();
        },
        default: []
    });

    @computed get isTumorDataAlreadyInLogValues() {
        return this.selectedNormalDataset === NormalDataset.hgu133plus2
    }

    @computed get molecularProfiles() {
        return this.props.normalMolecularProfilesMap[this.selectedNormalDataset];
    }

    @computed get studySamplesSet() {
        return _.groupBy(this.props.samples, sample => sample.studyId);
    }

    @computed get sampleSet() {
        return _.keyBy(this.props.samples, sample => sample.studyId + sample.sampleId);
    }

    readonly tumorData = remoteData<TumorVsNormalsData[]>({
        invoke: async () => {
            const sampleMolecularIdentifiers = _.flatMap(this.molecularProfiles, molecularProfile => {
                const samples = this.studySamplesSet[molecularProfile.studyId];

                return samples.map(sample => {
                    return {
                        molecularProfileId: molecularProfile.molecularProfileId,
                        sampleId: sample.sampleId
                    }
                });
            });

            const data = await client.fetchMolecularDataInMultipleMolecularProfilesUsingPOST(
                {
                    molecularDataMultipleStudyFilter: {
                        entrezGeneIds: [this.props.gene.entrezGeneId],
                        sampleMolecularIdentifiers,
                    } as MolecularDataMultipleStudyFilter,
                    projection: 'SUMMARY',
                }
            );

            return _.chain(data)
                .groupBy(datum => datum.studyId)
                .reduce((acc, next, studyId) => {
                    if (next.length > 1) {
                        acc.push({
                            data: next.map(datum => {
                                return {
                                    sampleId: datum.sampleId,
                                    value: datum.value,
                                    studyId: datum.studyId
                                }
                            }),
                            isTumorData: true,
                            name: this.props.studyIdToStudy[studyId].name,
                        } as any);
                    }
                    return acc;
                }, [] as TumorVsNormalsData[])
                .sortBy(datum => datum.name)
                .value();
        },
        default: []
    });

    readonly plotData = remoteData<TumorVsNormalsData[]>({
        await: () => [this.tumorData, this.normalTissueData],
        invoke: () => {
            let tumorData = _.cloneDeep(this.tumorData.result);
            let normalTissueData = _.cloneDeep(this.normalTissueData.result);
            const dataInLog = this.isTumorDataAlreadyInLogValues;
            const tumorLogValues = _.flatMap(tumorData, obj => {
                return obj.data.map(datum => dataInLog ? datum.value : Math.log1p(datum.value) / Math.log(2));
            });

            if (tumorData.length === 1) {
                normalTissueData.forEach(obj => {
                    const normalLogValues = obj.data.map(datum => dataInLog ? datum.value : Math.log1p(datum.value) / Math.log(2));
                    obj.pValue = ttest(tumorLogValues, normalLogValues).pValue();
                });
            }

            const allData = [...tumorData, ...normalTissueData];

            if (this.zScore) {
                const allNormalLogValues = _.flatMap(normalTissueData, obj => {
                    return obj.data.map(datum => dataInLog ? datum.value : Math.log1p(datum.value) / Math.log(2));
                });

                const values = tumorLogValues.concat(allNormalLogValues);
                const mean: number = jStat.mean(values);
                const stdev: number = jStat.stdev(values);

                allData.forEach(obj => {
                    obj.data.forEach(datum => {
                        let value = dataInLog ? datum.value : Math.log1p(datum.value) / Math.log(2);
                        datum.value = (value - mean) / stdev;
                    });
                });
            }

            return Promise.resolve(allData);
        },
        default: []
    });

    @computed get normalDataSetOptions() {
        return _.keys(this.props.normalMolecularProfilesMap).map(datum => {
            return {
                label: NormlaDataset[datum],
                value: datum as NormalDataset
            }
        });
    }

    @computed get controls() {
        return (
            <div className="axisBlock tumor-vs-normals--form-controls">
                <table>
                    <tr>
                        <td>
                            <span>Normal tissue dataset </span>
                        </td>
                        <td>
                            <div style={{ display: "inline-block", width: 150, marginLeft: 4, marginRight: 4, zIndex: 10 /* so that on top when opened*/ }}>
                                <Select
                                    name="query-profile-select"
                                    value={this.selectedNormalDataset}
                                    onChange={this.handleNormalDatasetChange}
                                    options={this.normalDataSetOptions}
                                    searchable={false}
                                    clearable={false}
                                    className="coexpression-select-query-profile"
                                />
                            </div>
                        </td>
                    </tr>
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

    @autobind
    @action onChange(values: { value: string }[]) {
        this.selectedIds = _.uniq([...values.map(datum => datum.value), ...this.alwaysVisibleIds])
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

    @autobind private filters() {
        return (
            <div className="axisBlock tissue-track-selector">
                <CheckedSelect
                    name='Add tissues'
                    placeholder='Add tissues'
                    onChange={this.onChange}
                    options={this.options.result}
                    value={this.selectedIds.map(x => ({ value: x }))}
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

            let sampleSet: { [id: string]: Sample } = {};

            _.each(this.plotData.result!, data => {
                if (_.includes(this.selectedIds, data.name)) {
                    if (data.isTumorData) {
                        data.data.forEach(sampleObj => {
                            let sample = this.sampleSet[sampleObj.studyId + sampleObj.sampleId];
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

                            let value = data.name;
                            if (data.pValue) {
                                value = `${value} (${data.pValue.toExponential(1)})`
                            }
                            categoryData.data.push({
                                uniqueSampleKey: sampleObj.sampleId,
                                value: value
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

    @computed get median() {
        let filteredPlotData = _.filter(this.plotData.result!, data => data.isTumorData);
        if (filteredPlotData.length === 1) {
            const vector = filteredPlotData[0].data.map(obj => (!this.isTumorDataAlreadyInLogValues && this.logScale) ? Math.log2(Math.max(obj.value, 0.01)) : obj.value)
            const sortedVector = _.sortBy<number>(vector, [(n: number) => n]);
            return (jStat.median(sortedVector) as number).toFixed(2);
        }
        return undefined;
    }

    get overflowStyle(): React.CSSProperties {
        return {
            position: 'relative',
            display: 'inline-block'
        };
    }
    @computed get tissuePValueSet() {
        return _.chain(this.plotData.result)
            .filter(obj => obj.pValue !== undefined)
            .keyBy(tissue => {
                let pValue = tissue.pValue ? ` (${tissue.pValue.toExponential(1)})` : ''
                return `${tissue.name}${pValue}`
            })
            .mapValues(obj => obj.pValue!)
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
                            boxWidth={25}
                            axisLabelX={'Tissue Type'}
                            axisLabelY={`${this.props.gene.hugoGeneSymbol}, Gene Expression Value${this.logScale ? '(Log2)' : ''}`}
                            data={this.boxPlotData.result!.data}
                            chartBase={600}
                            logScale={this.logScaleFunction}
                            scatterPlotTooltip={this.boxPlotTooltip}
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
                            {this.median && <VictoryLabel
                                text={`Median: ${this.median}`}
                                x={91}
                                y={65}
                                style={{ fontSize: 12, fontFamily: "Arial, Helvetica" }} />}
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
                    type='button'
                    style={{ position: "absolute", top: 0, right: 0 }}
                />

            </div>
        );
    }

    readonly tabUI = MakeMobxView({
        await: () => [
            this.plotData
        ],
        render: () => {
            return (
                <div style={{ display: "inherit", minHeight: 826, position: "relative" }}>
                    <div className={"tvnTab"} style={{ display: "flex", flexDirection: "row" }}>
                        <div className="leftColumn">
                            {this.controls}
                            <Observer>
                                {this.filters}
                            </Observer>
                        </div>
                        <WindowWidthBox offset={360}>
                            {this.plot}
                        </WindowWidthBox>
                    </div>
                </div>
            );
        },
        renderPending: () => <LoadingIndicator center={true} isLoading={true} size={"big"} />,
        renderError: () => <ErrorMessage />
    });


    render() {
        return this.tabUI.component;
    }
}