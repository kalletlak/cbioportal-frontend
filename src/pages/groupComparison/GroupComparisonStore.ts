import {ResultsViewPageStore} from "../resultsView/ResultsViewPageStore";
import {remoteData} from "../../shared/api/remoteData";
import ListIndexedMap from "../../shared/lib/ListIndexedMap";
import {Sample, SampleIdentifier} from "../../shared/api/generated/CBioPortalAPI";
import { computed } from "mobx";
import { PatientSurvival } from "shared/model/PatientSurvival";
import * as _ from "lodash";
import { COLORS } from "pages/studyView/StudyViewUtils";

export default class GroupComparisonStore {
    constructor(
        private resultsViewPageStore:ResultsViewPageStore
    ) {
    }

    public readonly sampleGroups = remoteData({
        await:()=>[
            this.resultsViewPageStore.samples,
            this.resultsViewPageStore.sampleGroups
        ],
        invoke:()=>{
            const sampleIdentifierToSample = new ListIndexedMap<Sample>();
            for (const sample of this.resultsViewPageStore.samples.result!) {
                sampleIdentifierToSample.set(sample, sample.sampleId, sample.studyId);
            }

            let colorIndex = 0;
            return Promise.resolve(
                this.resultsViewPageStore.sampleGroups.result!.map((group)=>({
                    name: group.name,
                    samples: _.reduce(group.sampleIdentifiers,(samples:Sample[], si:SampleIdentifier)=>{
                        if(sampleIdentifierToSample.get(si.sampleId, si.studyId)){
                            samples.push(sampleIdentifierToSample.get(si.sampleId, si.studyId)!);
                        }
                        return samples;
                    },[]),
                    color: group.color ? group.color : COLORS[(colorIndex++) % COLORS.length],
                    value: group.name,
                    legendText: group.legendText
                }))
            );
        }
    });

    public readonly patientToAnalysisGroup = remoteData({
        await: () => [
            this.sampleGroups
        ],
        invoke: () => {
            return Promise.resolve(_.reduce(this.sampleGroups.result, (acc, next) => {
                next.samples.forEach(sample => {
                    acc[sample.uniquePatientKey] = next.name;
                })
                return acc;
            }, {} as { [id: string]: string }));
        }
    });

    @computed get showSurvivalTab() {
        return this.resultsViewPageStore.survivalClinicalDataExists.isComplete && this.resultsViewPageStore.survivalClinicalDataExists.result;
    }

    readonly overallPatientSurvivals = remoteData<PatientSurvival[]>({
        await: () => [
            this.resultsViewPageStore.overallAlteredPatientSurvivals,
            this.resultsViewPageStore.overallUnalteredPatientSurvivals,
        ],
        invoke: async () => {
            return this.resultsViewPageStore.overallAlteredPatientSurvivals.result.concat(this.resultsViewPageStore.overallUnalteredPatientSurvivals.result);
        }
    }, []);

    readonly diseaseFreePatientSurvivals = remoteData<PatientSurvival[]>({
        await: () => [
            this.resultsViewPageStore.diseaseFreeAlteredPatientSurvivals,
            this.resultsViewPageStore.diseaseFreeUnalteredPatientSurvivals,
        ],
        invoke: async () => {
            return this.resultsViewPageStore.diseaseFreeAlteredPatientSurvivals.result.concat(this.resultsViewPageStore.diseaseFreeUnalteredPatientSurvivals.result);
        }
    }, []);
}