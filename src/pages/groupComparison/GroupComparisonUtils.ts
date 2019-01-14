import {SampleIdentifier} from "../../shared/api/generated/CBioPortalAPI";

export type SampleGroup = {
    name:string,
    sampleIdentifiers:SampleIdentifier[],
    color?: string;
    legendText?: string;
};