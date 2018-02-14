export interface IVirtualStudy {
    id: string;
    name: string;
    description: string;
    samples:{ sampleId: string, studyId:string }[];
    constituentStudyIds:string[];
};