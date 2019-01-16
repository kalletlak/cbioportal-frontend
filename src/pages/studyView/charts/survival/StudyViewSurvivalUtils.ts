import {PatientSurvival} from "../../../../shared/model/PatientSurvival";
import {IChartContainerProps} from "../ChartContainer";
import {AnalysisGroup} from "../../StudyViewPageStore";
import _ from "lodash";

export function makeSurvivalChartData(
    patientSurvivals: ReadonlyArray<PatientSurvival>,
    analysisGroups: ReadonlyArray<AnalysisGroup>,
    patientToAnalysisGroup: {[uniquePatientKey:string]:string},
    naPatientsHiddenInSurvival: boolean,
    patientKeysWithNAInSelectedClinicalData?:string[]
) {
    if (naPatientsHiddenInSurvival && patientKeysWithNAInSelectedClinicalData) {
        // filter out NA
        const clinicalNAPatientKeysMap = _.keyBy(patientKeysWithNAInSelectedClinicalData);
        patientSurvivals = patientSurvivals.filter(s=>{
            return (patientToAnalysisGroup[s.uniquePatientKey] !== "NA") && !(s.uniquePatientKey in clinicalNAPatientKeysMap);
        });
    }

    let patientToAnalysisGroups = _.reduce(patientToAnalysisGroup, (acc, group, uniquePatientKey)=>{
        acc[uniquePatientKey] = [group];
        return acc;
    }, {} as {[uniquePatientKey:string]:string[]});
    

    return {
        patientToAnalysisGroups, patientSurvivals, analysisGroups
    };
}

export function makeScatterPlotData(
) {
}