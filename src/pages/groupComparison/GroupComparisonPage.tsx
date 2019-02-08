import * as React from "react";
import {inject, observer} from "mobx-react";
import GroupComparisonStore, {GroupComparisonURLQuery} from "./GroupComparisonStore";
import MutationEnrichments from "./MutationEnrichments";
import {MSKTab, MSKTabs} from "../../shared/components/MSKTabs/MSKTabs";
import {PageLayout} from "../../shared/components/PageLayout/PageLayout";
import 'react-select/dist/react-select.css';
import Survival from "./Survival";
import Overlap from "./Overlap";
import CopyNumberEnrichments from "./CopyNumberEnrichments";
import MRNAEnrichments from "./MRNAEnrichments";
import ProteinEnrichments from "./ProteinEnrichments";
import {MakeMobxView} from "../../shared/components/MobxView";
import LoadingIndicator from "../../shared/components/loadingIndicator/LoadingIndicator";
import ErrorMessage from "../../shared/components/ErrorMessage";
import GroupSelector from "./GroupSelector";
import InfoIcon from "shared/components/InfoIcon";
import {caseCountsInParens, getTabId} from "./GroupComparisonUtils";
import "./styles.module.scss";
import {StudyLink} from "shared/components/StudyLink/StudyLink";
import {IReactionDisposer, reaction} from "mobx";
import autobind from "autobind-decorator";
import {AppStore} from "../../AppStore";
import _ from "lodash";

export enum GroupComparisonTab {
    OVERLAP = "overlap",
    MUTATIONS = "mutations",
    CNA = "cna",
    MRNA = "mrna",
    PROTEIN = "protein",
    SURVIVAL = "survival"
}

export interface IGroupComparisonPageProps {
    routing:any;
    appStore:AppStore;
}

@inject('routing', 'appStore')
@observer
export default class GroupComparisonPage extends React.Component<IGroupComparisonPageProps, {}> {
    private store:GroupComparisonStore;
    private queryReaction:IReactionDisposer;
    private pathnameReaction:IReactionDisposer;
    private lastQuery:Partial<GroupComparisonURLQuery>;

    constructor(props:IGroupComparisonPageProps) {
        super(props);
        this.store = new GroupComparisonStore();
        (window as any).groupComparisonStore = this.store;
        this.queryReaction = reaction(
            () => props.routing.location.query,
            query => {

                if (!props.routing.location.pathname.includes("/comparison") ||
                    _.isEqual(query, this.lastQuery)) {
                    return;
                }

                this.store.updateStoreFromURL(query);
                this.lastQuery = query;
            },
            {fireImmediately: true}
        );

        this.pathnameReaction = reaction(
            () => props.routing.location.pathname,
            pathname => {

                if (!pathname.includes("/comparison")) {
                    return;
                }

                const tabId = getTabId(pathname);
                if (tabId) {
                    this.store.setTabId(tabId);
                }
            },
            {fireImmediately: true}
        );
    }

    @autobind
    private setTabId(id:string, replace?:boolean) {
        this.props.routing.updateRoute({},`comparison/${id}`, false, replace);
    }

    componentWillUnmount() {
        this.queryReaction && this.queryReaction();
        this.pathnameReaction && this.pathnameReaction();
    }

    readonly tabs = MakeMobxView({
        await:()=>[
            this.store.mutationEnrichmentProfiles,
            this.store.copyNumberEnrichmentProfiles,
            this.store.mRNAEnrichmentProfiles,
            this.store.proteinEnrichmentProfiles,
            this.store.survivalClinicalDataExists,
        ],
        render:()=>{
            if ((this.store.mutationEnrichmentProfiles.result!.length > 0) ||
                (this.store.copyNumberEnrichmentProfiles.result!.length > 0) ||
                (this.store.mRNAEnrichmentProfiles.result!.length > 0) ||
                (this.store.proteinEnrichmentProfiles.result!.length > 0) ||
                this.store.showSurvivalTab
            ) {
                return <MSKTabs unmountOnHide={false} activeTabId={this.store.currentTabId} onTabClick={this.setTabId} className="primaryTabs">
                    <MSKTab id={GroupComparisonTab.OVERLAP.toString()} linkText="Overlapping">
                        <Overlap store={this.store}/>
                    </MSKTab>
                    {
                        this.store.showSurvivalTab &&
                        <MSKTab id={GroupComparisonTab.SURVIVAL.toString()} linkText="Survival">
                            <Survival store={this.store}/>
                        </MSKTab>
                    }
                    {this.store.mutationEnrichmentProfiles.result!.length > 0 && (
                        <MSKTab id={GroupComparisonTab.MUTATIONS.toString()} linkText="Mutations"
                            anchorClassName={this.store.mutationsTabGrey ? "greyedOut" : ""}
                        >
                            <MutationEnrichments store={this.store}/>
                        </MSKTab>
                    )}
                    {this.store.copyNumberEnrichmentProfiles.result!.length > 0 && (
                        <MSKTab id={GroupComparisonTab.CNA.toString()} linkText="Copy-number"
                            anchorClassName={this.store.copyNumberTabGrey ? "greyedOut" : ""}
                        >
                            <CopyNumberEnrichments store={this.store}/>
                        </MSKTab>
                    )}
                    {this.store.mRNAEnrichmentProfiles.result!.length > 0 && (
                        <MSKTab id={GroupComparisonTab.MRNA.toString()} linkText="mRNA"
                            anchorClassName={this.store.mRNATabGrey ? "greyedOut" : ""}
                        >
                            <MRNAEnrichments store={this.store}/>
                        </MSKTab>
                    )}
                    {this.store.proteinEnrichmentProfiles.result!.length > 0 && (
                        <MSKTab id={GroupComparisonTab.PROTEIN.toString()} linkText="Protein"
                            anchorClassName={this.store.proteinTabGrey ? "greyedOut" : ""}
                        >
                            <ProteinEnrichments store={this.store}/>
                        </MSKTab>
                    )}
                </MSKTabs>;
            } else {
                return <span>No data.</span>;
            }
        },
        renderPending:()=><LoadingIndicator isLoading={true} big={true}/>,
        renderError:()=><ErrorMessage/>
    });

    readonly studyLink = MakeMobxView({
        await:()=>[this.store.studies],
        render:()=>{
            const studies = this.store.studies.result!;
            let ret = <span/>;
            switch (studies.length) {
                case 0:
                    ret = <span/>;
                    break;
                case 1:
                    ret = <h3><StudyLink studyId={studies[0].studyId}>{studies[0].name}</StudyLink></h3>;
                    break;
                default:
                    ret = (<h4>
                        <a
                            href={`study?id=${studies.map(study => study.studyId).join(',')}`}
                            target="_blank"
                        >
                            Multiple studies
                        </a>
                    </h4>);
            }
            return ret;
        } 
    });

    render() {
        return (
            <PageLayout>
                <div style={{display:"flex", flexDirection:"column"}}>
                    <div>
                        {this.studyLink.component}
                    </div>
                    <div style={{marginBottom:30}}>
                        <div style={{display:"flex", flexDirection:"row", alignItems:"center"}}>
                            <span style={{marginRight:10}}>Groups (click to toggle):</span>
                            <GroupSelector
                                store = {this.store}
                            />
                            <span style={{marginLeft:10}}>
                                <button type="button" className="btn" 
                                    style={{border:"1px solid #dddddd"}}
                                    onClick={this.store.toggleExcludeOverlapping}
                                >
                                    <input
                                        type="checkbox"
                                        checked={this.store.excludeOverlapping}
                                    />
                                    <span style={{marginLeft:7}}>
                                        {`* Exclude overlapping samples/patients ${caseCountsInParens(this.store.overlappingSelectedSamples, this.store.overlappingSelectedPatients)} from selected groups.`}
                                    </span> 
                                    <div style={{display:"inline-block", marginLeft:7}}>
                                        <InfoIcon 
                                            tooltip={<span style={{maxWidth:200}}>Exclude samples from analysis which occur in more than one selected group.</span>}
                                        />
                                    </div>
                                </button>
                            </span>
                        </div>
                    </div>
                    <div>
                        {this.tabs.component}
                    </div>
                </div>
            </PageLayout>
        );
    }
}