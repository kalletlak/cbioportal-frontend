import * as request from 'superagent';
import {getSessionServiceApiUrl} from "./urls";
import {IVirtualStudy} from "shared/model/VirtualStudy";


type VirtualStudyData = {
    name: string;
    description: string;
    studies:{ id:string, samples: string[] }[];
    origin: string;
    filters:{ patients: Map<string, string[]>;
              samples:  Map<string, string[]>};
};

type VirtualStudy = {
    id: string;
    data: VirtualStudyData;
};

export default class sessionSeriveAPI {
    /**
     * Retrieve Virtual Studies
     */
    getUserVirtualStudies(): Promise<Array<IVirtualStudy>> {
        return request
                .get(getSessionServiceApiUrl())
                .then((res) => {
                    let response : Array<VirtualStudy> = res.body;
                    return response.map((record: VirtualStudy) => {
                        let constituentStudyIds:string[] = []
                        let studySamples = record.data.studies.map((obj) => {
                            constituentStudyIds.push(obj.id)
                            return obj.samples.map((sample)=>({studyID:obj.id,sample:sample}))
                        })
                        let samples = [].concat.apply([], studySamples)
                        
                        return {
                            id: record.id,
                            name: record.data.name,
                            description: record.data.description,
                            samples:samples,
                            constituentStudyIds:constituentStudyIds
                        }
                    });
                });              
    }

    deleteVirtualStudy(id:string){
        return request
                .delete(`${getSessionServiceApiUrl()}/${id}`)
                             
    }

    addVirtualStudy(id:string){
        return request
                .put(`${getSessionServiceApiUrl()}/${id}`)
                             
    }
}
