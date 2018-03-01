import {assert} from "chai";
import {QueryStore, CUSTOM_CASE_LIST_ID} from "./QueryStore";

describe("QueryStore", ()=>{
    describe("initialQueryParams on results page", ()=>{
        it("should contain the correct case_ids parameter in single study query", ()=>{
            const store = new QueryStore({
                serverVars: {
                    theQuery:"",
                    caseSetProperties:{
                        case_set_id: CUSTOM_CASE_LIST_ID
                    },
                    caseIds:"study1:sample1+study1:sample2+study1:sample3"
                }
            } as any);
            assert.equal(
                store.initialQueryParams.nonMolecularProfileParams.case_ids,
                "study1:sample1\nstudy1:sample2\nstudy1:sample3"
            );
        });
        it("should contain the correct case_ids parameter in multiple study query", ()=>{
            const store = new QueryStore(
                {
                    serverVars: {
                        theQuery:"",
                        caseSetProperties:{
                            case_set_id: CUSTOM_CASE_LIST_ID
                        },
                        caseIds:"study1:sample1+study1:sample2+study1:sample3+study2:sample4+study2:sample5+study2:sample6"
                    }
                } as any
            );
            assert.equal(
                store.initialQueryParams.nonMolecularProfileParams.case_ids,
                "study1:sample1\nstudy1:sample2\nstudy1:sample3\nstudy2:sample4\nstudy2:sample5\nstudy2:sample6"
            );
        });
    });
});