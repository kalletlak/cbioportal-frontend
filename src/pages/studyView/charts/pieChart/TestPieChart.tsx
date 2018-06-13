import * as React from "react";
import { VictoryPie } from 'victory';
import { observer } from "mobx-react";

@observer
export default class TestPieChart extends React.Component<{}, { externalMutations: any[] | undefined }> {
    constructor() {
        super();
        this.state = {
            externalMutations: undefined
        };
    }

    tooltipMouseLeaveLabel() {
        this.setState({
            externalMutations: [
                {
                    target: "data",
                    eventKey: "all",
                    mutation: () => ({ style: undefined }),
                }
            ]
        });
    }
    tooltipMouseEnterLabel() {
        this.setState({
            externalMutations: [
                {
                    target: "data",
                    eventKey: "all",
                    mutation: (props: any) => {
                        console.log(props)
                        return {
                            style: Object.assign({}, props.style, { fill: "red" })
                        };
                    },
                }
            ]
        });
    }

    render() {
        console.log(this.state.externalMutations)
        return (
            <div style={{ width: '200px', height: '200px' }}>
                <div
                    onMouseLeave={this.tooltipMouseLeaveLabel.bind(this)}
                    onMouseEnter={this.tooltipMouseEnterLabel.bind(this)}
                    style={{ backgroundColor: "black", color: "white" }}
                >
                    MouseOver
                </div>
                <VictoryPie
                    style={{ labels: { fontSize: 25, padding: 10 } }}
                    data={[
                        { value: "a", count: 1 }, { value: "b", count: 4 }, { value: "c", count: 5 }, { value: "d", count: 7 }
                    ]}
                    eventKey="value"
                    x="value"
                    y="count"
                    externalEventMutations={this.state.externalMutations}
                    events={[{
                        target: "data",
                        eventHandlers: {
                            onClick: () => {
                                return [{
                                    target: "data",
                                    mutation: (props: any) => {
                                        return {
                                            style: Object.assign({}, props.style, { fill: "tomato" })
                                        };
                                    }
                                }];
                            }
                        }
                    }]}
                />
            </div>
        )
    }
}