import QueryAndDownloadTabs from './QueryAndDownloadTabs';
import React from 'react';
import { assert,expect } from 'chai';
import { shallow, mount, ReactWrapper, ShallowWrapper } from 'enzyme';
import sinon from 'sinon';
import { Tab } from 'react-bootstrap';
import {QueryStore} from "./QueryStore";
import {VirtualStudy, VirtualStudyData} from "shared/model/VirtualStudy";
import sessionServiceClient from "shared/api//sessionServiceInstance";

describe('QueryAndDownloadTabs', () => {
      
    it('Hides download tab if prop showDownloadTab is false', ()=>{
        const comp = shallow(<QueryAndDownloadTabs store={({} as QueryStore)} />);
        assert.equal(comp.find(Tab).length, 2);
        comp.setProps({ showDownloadTab:false });
        assert.equal(comp.find(Tab).length, 1);
    });

    describe('VirtualStudyOperations', () => {
        let store:QueryStore;
        const virtualStudies: VirtualStudy[] = [
            {
            "id": "1234",
            "data": {
                "name": "Test Study",
                "description": "Test Study",
                "studies": [
                {
                    "id": "test_study",
                    "samples": [
                    "sample-01",
                    "sample-02",
                    "sample-03"
                    ]
                }
                ],
                "filters": {
                "patients": {},
                "samples": {}
                },
                "origin": [
                "test_study"
                ]
            } as VirtualStudyData
            }
        ];
        let component : ReactWrapper<any, any>
        let deleteVirtualStudyStub: sinon.SinonStub
        let addVirtualStudyStub: sinon.SinonStub
        let getVirtualStudiesStub: sinon.SinonStub

        before(()=>{

            getVirtualStudiesStub = sinon.stub(sessionServiceClient, "getUserVirtualStudies").callsFake(function fakeFn() {
                return new Promise((resolve, reject) => {
                    resolve(virtualStudies);
                });
            });

             deleteVirtualStudyStub = sinon.stub(sessionServiceClient, "deleteVirtualStudy").callsFake(function fakeFn(id:string) {
                return new Promise((resolve, reject) => {
                    //manually update deletedVirtualStudies, since this view component doesn't update during testing
                    (component.props().store as QueryStore).deletedVirtualStudies = [id];
                    resolve();
                });
            });

             addVirtualStudyStub = sinon.stub(sessionServiceClient, "addVirtualStudy").callsFake(function fakeFn(id:string) {
                return new Promise((resolve, reject) => {
                    //manually update deletedVirtualStudies, since this view component doesn't update during testing
                    (component.props().store as QueryStore).deletedVirtualStudies = [];
                    resolve();
                });
            });
            
            store= new QueryStore({} as any);
            component = mount(<QueryAndDownloadTabs store={store} />);
        });

        it('View VirtualStudies', ()=>{
            expect(component.find('[data-test="VirtualStudySelect"]')).to.have.lengthOf(virtualStudies.length)
        });

        it('Delete VirtualStudy', ()=>{
            expect(component.find('[data-test="VirtualStudySelect"]')).to.not.be.empty;
            let deleteButton = component.find('[data-test="VirtualStudySelect"]').at(0).find('.fa-trash');

            expect(deleteButton).to.exist
            deleteButton.simulate('click');

            assert.isTrue(deleteVirtualStudyStub.calledOnce);
            expect(component.find('[data-test="VirtualStudySelect"]').at(0).find('[data-test="virtualStudyRestore"]')).to.exist;
        });
        it("Restore back VirtualStudy", ()=>{
            expect(component.find('[data-test="VirtualStudySelect"]')).to.not.be.empty;
            let restoreButton = component.find('[data-test="VirtualStudySelect"]').at(0).find('[data-test="virtualStudyRestore"]');

            expect(restoreButton).to.exist
            restoreButton.simulate('click');
            
            assert.isTrue(addVirtualStudyStub.calledOnce);
            expect(component.find('[data-test="VirtualStudySelect"]').at(0).find('.fa-trash')).to.exist;
        });
    });
});
