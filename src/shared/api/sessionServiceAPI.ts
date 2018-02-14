import * as request from 'superagent';
import {getSessionServiceApiUrl} from "./urls";
import {IVirtualStudy} from "shared/model/VirtualStudy";


type VirtualStudyData = {
    name: string;
    description: string;
    studies:{ id:string, samples: string[] }[];
    owner: string;
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
                        const constituentStudyIds:string[] = []
                        const samplesTemp = record.data.studies.map((obj) => {
                            constituentStudyIds.push(obj.id)
                            return obj.samples.map((sample)=>({studyID:obj.id,sample:sample}))
                        })
                        const samples = [].concat.apply([], samplesTemp)
                        
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
    deleteVirtualStudy1(id:string) {
        return request
                .delete(`${getSessionServiceApiUrl()}/${id}`)
                             
    }
}
