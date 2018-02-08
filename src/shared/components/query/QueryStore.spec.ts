import {assert} from "chai";
import {QueryStore, CUSTOM_CASE_LIST_ID} from "./QueryStore";
import sinon from 'sinon';

describe("QueryStore", ()=>{

    it("should correctly calculate Sample List Id from datatype priority in multiple study query", ()=>{
        const calculateSampleListId = (QueryStore as any).prototype.calculateSampleListId;
        assert.equal(calculateSampleListId({mutation:true,cna:true})   , '0');
        assert.equal(calculateSampleListId({mutation:true,cna:false})  , '1');
        assert.equal(calculateSampleListId({mutation:false,cna:true})  , '2');
        assert.equal(calculateSampleListId({mutation:false,cna:false}) , 'all');
    });

    describe("initialQueryParams on results page", ()=>{
        it("should contain the correct case_ids parameter in single study query", ()=>{
            const store = new QueryStore({
                serverVars: {
                    studySampleObj: {
                        study1: ["sample1", "sample2", "sample3"]
                    },
                    theQuery:"",
                    caseSetProperties:{
                        case_set_id: CUSTOM_CASE_LIST_ID
                    }
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
                        studySampleObj: {
                            study1: ["sample1", "sample2", "sample3"],
                                study2: ["sample4", "sample5", "sample6"]
                        },
                        theQuery:"",
                        caseSetProperties:{
                            case_set_id: CUSTOM_CASE_LIST_ID
                        }
                    }
                } as any
            );
            assert.equal(
                store.initialQueryParams.nonMolecularProfileParams.case_ids,
                "study1:sample1\nstudy1:sample2\nstudy1:sample3\nstudy2:sample4\nstudy2:sample5\nstudy2:sample6"
            );
        });
    });

    describe("query page", ()=>{
        before(() => {
            sinon.stub(QueryStore.prototype,"selectableStudiesSet").get(()=>{
                return {study1:true,study2:true};
            });
        });

        it("should show an error when both mutation and cna datatype checkboxes are unchecked", ()=>{
            const store = new QueryStore(
                {
                    cohortIdsList:["study1","study2"]
                } as any
            );
            store.dataTypePriority = {mutation:false,cna:false};
            assert.equal(store.submitError,"Please select one or more molecular profiles.");
            store.dataTypePriority = {mutation:true,cna:false};
            assert.notEqual(store.submitError,"Please select one or more molecular profiles.");
        });
    });
});