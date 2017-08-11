import * as React from 'react';
import {localStorageUtil} from "../lib/HarvestUtils";
import FontAwesome from "react-fontawesome";
import DefaultTooltip from "./defaultTooltip/DefaultTooltip";


interface IHarvestSampleButtonState {
    icon:string;
    tooltip:string;
    operation:string;
}

interface IHarvestSampleButtonProps {
    sampleId: string;
}

const addButton:IHarvestSampleButtonState = {
    icon: 'minus-circle',
    tooltip: 'Delete',
    operation: 'delete'
};

const deleteButton:IHarvestSampleButtonState = {
    icon: 'plus-circle',
    tooltip: 'Add',
    operation: 'add'
};

export default class HarvestButton extends React.Component<IHarvestSampleButtonProps, IHarvestSampleButtonState> {

    constructor(props:IHarvestSampleButtonProps) {
        super(props);
        let isSamplePresent = localStorageUtil('harvest_samples', 'check', this.props.sampleId.trim());
        this.state = isSamplePresent ? addButton : deleteButton;
    }

    render() {
        let content = (
            <span
                onClick={() => {
                                    let added = localStorageUtil('harvest_samples', this.state.operation, this.props.sampleId.trim());
                                    this.setState((this.state.operation === 'add' && added) ? addButton : deleteButton)
					    }}>
                <FontAwesome
                    name={this.state.icon}
                />
            </span>
        );

        content = (
            <DefaultTooltip overlay={<span>{this.state.tooltip}</span>}
                            placement="right">
                {content}
            </DefaultTooltip>
        );
        return content;
    }
}
