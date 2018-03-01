import * as request from 'superagent';
import {getSessionServiceApiUrl} from "./urls";
import {VirtualStudy} from "shared/model/VirtualStudy";

export default class sessionSeriveAPI {
    /**
     * Retrieve Virtual Studies
     */
    getUserVirtualStudies(): Promise<Array<VirtualStudy>> {
        return request
                .get(getSessionServiceApiUrl())
                .then((res) => {
                    return res.body;
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
