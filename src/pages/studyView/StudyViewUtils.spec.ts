import { assert } from 'chai';
import { getVirtualStudyDescription } from 'pages/studyView/StudyViewUtils';

describe('StudyViewUtils', () => {
    describe('getVirtualStudyDescription', () => {
        let studies = [{
            name: 'Study 1',
            studyId: 'study1',
            uniqueSampleKeys: ['1', '2']
        },
        {
            name: 'Study 2',
            studyId: 'study2',
            uniqueSampleKeys: ['3', '4']
        }];
        let selectedSamples = [{
            studyId: 'study1',
            uniqueSampleKey: '1'
        }, {
            studyId: 'study1',
            uniqueSampleKey: '2'
        }, {
            studyId: 'study2',
            uniqueSampleKey: '3'
        }, {
            studyId: 'study2',
            uniqueSampleKey: '4'
        }];

        let filter = {
            'clinicalDataEqualityFilters': [{
                'attributeId': 'attribute1',
                'clinicalDataType': "SAMPLE",
                'values': ['value1']
            }],
            'studyIds': ['study1', 'study2']
        }

        it('when all samples are selected', () => {
            assert.isTrue(getVirtualStudyDescription(studies as any, selectedSamples as any, {} as any).startsWith('4 samples from 2 studies:\n- Study 1 (2 samples)\n- Study 2 (2 samples)'));
        });
        it('when filters are applied', () => {
            assert.isTrue(getVirtualStudyDescription(studies as any, [{ studyId: 'study1', uniqueSampleKey: '1' }] as any, filter as any).startsWith('1 sample from 1 study:\n- Study 1 (1 samples)\n\nFilters:\n- attribute1: value1'));
        });
        it('when username is not null', () => {
            assert.isTrue(getVirtualStudyDescription(studies as any, selectedSamples as any, {} as any, 'user1').startsWith('4 samples from 2 studies:\n- Study 1 (2 samples)\n- Study 2 (2 samples)'));
            assert.isTrue(getVirtualStudyDescription(studies as any, selectedSamples as any, {} as any, 'user1').endsWith('by user1'));
        });
    });
});