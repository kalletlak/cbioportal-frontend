import * as React from "react";
import styles from "./styles.module.scss";
import { observer } from "mobx-react";
import { VictoryPie, VictoryContainer, VictoryLabel, Slice } from 'victory';
import { observable, computed, action, toJS } from "mobx";
import _ from "lodash";
import { COLORS, UNSELECTED_COLOR, NA_COLOR } from "pages/studyView/StudyViewUtils";
import CBIOPORTAL_VICTORY_THEME from "shared/theme/cBioPoralTheme";
import { AbstractChart } from "pages/studyView/charts/ChartContainer";
import { ClinicalDataCount } from "shared/api/generated/CBioPortalAPIInternal";
import LazyMobXTable from "shared/components/lazyMobXTable/LazyMobXTable";
import { bind } from "bind-decorator";
import LabeledCheckbox from "shared/components/labeledCheckbox/LabeledCheckbox";
import classnames from 'classnames';
import autobind from "autobind-decorator";

export interface IPieChartProps {
    data: ClinicalDataCount[];
    filters:string[];
    onUserSelection:(values:string[])=>void;
    active:boolean,
    placement:'left'|'right'
}

interface IPieChartState {
    externalMutations:any[]|undefined;
}

@observer
export default class PieChart extends React.Component<IPieChartProps, IPieChartState> implements AbstractChart{

    // used in saving slice color
    private colorSet:{[id:string]:string} = {};
    private svgContainer: any;
    @observable isTooltipHovered: boolean = false;
    private id = Math.random()

    constructor(props: IPieChartProps) {
        super(props);

        this.state = {
            externalMutations: undefined
        }
    }

    @bind
    private onUserSelection(filter:string) {
        let filters = this.props.filters;
        if(_.includes(filters,filter)){
            filters = _.filter(filters, obj=> obj !== filter);
        }else{
            filters.push(filter);
        }
        this.props.onUserSelection(filters);
    }

    private get userEvents(){
        const self = this;
        return [{
            target: "data",
            eventHandlers: {
                onClick: () => {
                    return [
                        {
                            target: "data",
                            mutation: (props:any) => {
                                this.onUserSelection(props.datum.x);
                            }
                        }
                    ];
                }
            }
        }];
    }

    @bind
    private tooltipMouseEnter(): void {
        this.isTooltipHovered = true;
    }

    @bind
    private tooltipMouseLeave(): void {
        this.isTooltipHovered = false;
    }

    public downloadData() {
        return this.props.data.map(obj=>obj.value+'\t'+obj.count).join('\n');
    }

    public toSVGDOMNode():Element {
        return this.svgContainer.firstChild
    }

    @computed get totalCount(){
        return _.sumBy(this.props.data, obj=>obj.count)
    }

    /* Add style properties for each slice datum and make sure
    that the slice color remain same with and without filters

    Step1: check if the slice already has a color assigned
            a. YES -> Go to Step 2
            b. No  -> assign a color depending on the value and update the set
    Step2: check if the filters is empty
            a. Yes -> add fill property to slice datum
            b. No  -> add appropriate slice style properties depending on the filters
    */
    @computed get annotatedData() {
        let totalCount = _.sumBy(this.props.data, obj=>obj.count);
        return this.props.data.map(slice => {
            let color = this.colorSet[slice.value];
            let frequency = ((slice.count/totalCount)*100).toFixed(2)
            if (_.isUndefined(color)) {
                if (slice.value.toLowerCase().includes('na')) {
                    color = NA_COLOR;
                } else {
                    color = COLORS[Object.keys(this.colorSet).length];
                }
                this.colorSet[slice.value] = color;
            }
            if (_.isEmpty(this.props.filters)) {
                return { ...slice, fill: color, color:color, frequency: frequency+'%'};
            } else {
                if (_.includes(this.props.filters, slice.value)) {
                    return { ...slice, fill: color, color:color, stroke: "#cccccc", strokeWidth: 3, frequency: frequency+'%' };
                } else {
                    return { ...slice, fill: UNSELECTED_COLOR, color:color, fillOpacity: '0.5', frequency: frequency+'%' };
                }
            }
        })
    }

    @observable tooltipHighlightedRow:string|undefined = undefined

   /*  @observable externalMutationEvents:any[]|undefined = []

    @bind
    @action
    private callback(): void {
        this.externalMutationEvents = undefined
    } */

    @bind
    @action
    private tooltipMouseEnterLabel(value:string): void {
        this.tooltipHighlightedRow = value;
        console.log('in tooltipMouseEnterLabel : '+value)
        /* this.externalMutationEvents = [
            {
              childName: "pie",
              target: ["data"],
              eventKey: value,
              mutation: (props:any) => {
                  console.log(props)
                return { style: undefined }
              },
              callback: this.callback
            }
          ] */

          this.setState({
            externalMutations: [
              {
                //childName: `pie-${this.id}`,
                target: "data",
                eventKey: "all",
                mutation: (props:any) => {
                            return {
                              style: Object.assign({}, props.style, {fill: "red"})
                            };
                },
                callback: this.removeMutation.bind(this)
              }
            ]
          });
    }

    @bind
    removeMutation() {
        console.log('came to removeMutation')
          this.setState({
            externalMutations: undefined
          });
    }

    @bind
    @action
    private tooltipMouseLeaveLabel(): void {
        console.log('in tooltipMouseLeaveLabel')
        this.tooltipHighlightedRow = undefined;
        this.setState({
            externalMutations: [
              {
                //childName: `pie-${this.id}`,
                target: "data",
                eventKey: "all",
                mutation: () => ({ style: undefined }),
                callback: this.removeMutation.bind(this)
              }
            ]
          });
    }

    @computed get showTooltip(){
        return this.props.active || this.isTooltipHovered
    }


    @computed get tooltip(){
        let left = _.isEqual(this.props.placement,'right')? '195px' : '-350px'
        return(
            <div className={ classnames('popover', this.props.placement) }
                onMouseLeave={() => this.tooltipMouseLeave()}
                onMouseEnter={() => this.tooltipMouseEnter()}
                style={{ display: 'block', position: 'absolute', left: left, width: '350px', maxWidth: '350px' }}>

                <div className="arrow" style={{ top: 20 }}></div>
                <div className="popover-content">
                    <LazyMobXTable
                        className={styles.tooltip}
                        showCopyDownload={false}
                        data={this.annotatedData}
                        showFilter={true}
                        showColumnVisibility={false}
                        enableHorizontalScroll={false}
                        initialSortColumn='#'
                        initialSortDirection='desc'
                        filterPlaceholder="Search..."
                        showPagination={true}
                        showPaginationAtTop={false}
                        paginationProps={{
                            showMoreButton: false,
                            showItemsPerPageSelector: false
                        }}
                        initialItemsPerPage={15}
                        columns={
                            [{
                                name: 'Category',
                                render: (data: any) => {
                                    return (
                                        <div 
                                            className={styles.label}
                                            onMouseEnter={event => {this.tooltipMouseEnterLabel(data.value)}}
                                            onMouseLeave={this.tooltipMouseLeaveLabel}>
                                            <svg  width="18" height="12">
                                                <g>
                                                    <rect x="0" y="0" width="12" height="12" fill={data.color} />
                                                </g>
                                            </svg>
                                            <span title={data.value} className={styles.labelContent}>{data.value}</span>
                                        </div>
                                    )
                                },
                                filter: (d: any, f: string, filterStringUpper: string) => (d.value.indexOf(filterStringUpper) > -1),
                                sortBy: (d: any) => d.value,
                                width: "60%"
                            },
                            {
                                name: '#',
                                render: (data: any) =>
                                    <LabeledCheckbox
                                        checked={_.includes(this.props.filters, data.value)}
                                        onChange={event => this.onUserSelection(data.value)}>
                                        {data.count}
                                    </LabeledCheckbox>,
                                filter: (d: any, f: string, filterStringUpper: string) => (d.count.toString().indexOf(filterStringUpper) > -1),
                                sortBy: (d: any) => d.count,
                                width: "20%"
                            },
                            {
                                name: 'Freq',
                                render: (data: any) => <span>{data.frequency}</span>,
                                filter: (d: any, f: string, filterStringUpper: string) => (d.frequency.toString().indexOf(filterStringUpper) > -1),
                                sortBy: (d: any) => d.count,//sort freq column using count
                                width: "20%"
                            }]
                        }
                    />
                </div>
            </div>
        )
    }

    get overflowStyle():React.CSSProperties {
        return {
            position:'relative',
            display:'inline-block',
           // width: 'auto'
        };
    }

    public render() {
        //to hide label if the angle is too small(currently set to 20 degrees)
        console.log(this.state.externalMutations)
        return (
            <div style={this.overflowStyle}>
                {
                    this.showTooltip && this.tooltip
                }
                <VictoryPie
                    theme={CBIOPORTAL_VICTORY_THEME}
                    containerComponent={<VictoryContainer
                                            responsive={false}
                                            containerRef={(ref: any) => this.svgContainer = ref}
                                        />}
                    width={190}
                    height={185}
                    labelRadius={30}
                    padding={30}
                    labels={(d:any) => ((d.y*360)/this.totalCount)<20?'':d.y}
                    data={this.annotatedData}
                    dataComponent={<CustomSlice/>}
                    events={this.userEvents}
                    labelComponent={<VictoryLabel/>}
                    externalEventMutations={this.state.externalMutations}
                    style={{
                        data: { fillOpacity: 0.9 },
                        labels: { fill: "white" }
                    }}
                    x="value"
                    y="count"
                    eventKey="value"
                />
            </div>
        );
    }

}

class CustomSlice extends React.Component<{}, {}> {
    render() {
        const d:any = this.props;
        return (
        <g>
            <Slice {...this.props}/>
            <title>{`${d.datum.x}:${d.datum.y}`}</title>
        </g>
        );
    }
}