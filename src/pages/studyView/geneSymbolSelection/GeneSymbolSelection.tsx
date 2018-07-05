import * as React from 'react';
import * as _ from 'lodash';
import { observer } from "mobx-react";
import classnames from 'classnames';
import styles from "./styles.module.scss";
import { observable, computed, action } from 'mobx';
import { Gene } from 'shared/api/generated/CBioPortalAPI';
import { SingleGeneQuery, SyntaxError } from 'shared/lib/oql/oql-parser';
import { parseOQLQuery } from 'shared/lib/oql/oqlfilter';
import FontAwesome from "react-fontawesome";
import { remoteData } from 'shared/api/remoteData';
import { debounceAsync } from 'mobxpromise';
import { GeneReplacement, normalizeQuery } from 'shared/components/query/QueryStore';
import memoize from 'memoize-weak-decorator';
import ReactSelect from 'react-select';
import client from "shared/api/cbioportalClientInstance";

export interface IGeneSymbolSelectionProps {
    tablesSelectedGenes: Gene[];
    onSubmit?: (genes: Gene[]) => void;
    geneQueryErrorDisplayStatus?: 'unfocused' | 'shouldFocus' | 'focused';
    updateSelectedGenes: (query: SingleGeneQuery[], genes: Gene[]) => void;
}

function isInteger(str: string) {
    return Number.isInteger(Number(str));
}


@observer
export default class GeneSymbolSelection extends React.Component<IGeneSymbolSelectionProps, {}> {

    @observable _geneQuery = '';
    @observable _geneQueryErrorDisplayStatus: 'unfocused' | 'shouldFocus' | 'focused' = 'unfocused';

    @computed get tablesSelectedGenesStr(){
        return this.props.tablesSelectedGenes.map(gene=>gene.hugoGeneSymbol).join(' ');
    }

    get geneQuery() {
        return this._geneQuery;
    }
    set geneQuery(value: string) {
        // clear error when gene query is modified
        this._geneQueryErrorDisplayStatus = 'unfocused';
        this._geneQuery = value;
    }

    @computed private get textAreaRef() {
        if (this.props.geneQueryErrorDisplayStatus === 'shouldFocus')
            return (textArea: HTMLTextAreaElement) => {
                let { error } = this.oql;
                if (textArea && error) {
                    textArea.focus();
                    textArea.setSelectionRange(error.start, error.end);
                    this._geneQueryErrorDisplayStatus = 'focused';
                }
            };
    }

    @computed private get oql(): {
        query: SingleGeneQuery[],
        error?: { start: number, end: number, message: string }
    } {
        try {
            return {
                query: this.geneQuery ? parseOQLQuery(this.geneQuery.trim().toUpperCase()) : [],
                error: undefined
            };
        }
        catch (error) {
            if (error.name !== 'SyntaxError')
                return {
                    query: [],
                    error: { start: 0, end: 0, message: `Unexpected ${error}` }
                };

            let { offset } = error as SyntaxError;
            let near, start, end;
            if (offset === this.geneQuery.length)
                [near, start, end] = ['after', offset - 1, offset];
            else if (offset === 0)
                [near, start, end] = ['before', offset, offset + 1];
            else
                [near, start, end] = ['at', offset, offset + 1];
            let message = `OQL syntax error ${near} selected character; please fix and submit again.`;
            return {
                query: [],
                error: { start, end, message }
            };
        }
    }

    @computed private get geneIds(): string[] {
        try {
            return this.oql.query.map(line => line.gene);
        }
        catch (e) {
            return [];
        }
    }

    @memoize
    private async getGeneSuggestions(alias: string): Promise<GeneReplacement> {
        return {
            alias,
            genes: await client.getAllGenesUsingGET({ alias })
        };
    }

    private invokeGenesLater = debounceAsync(
        async (geneIds: string[]): Promise<{ found: Gene[], suggestions: GeneReplacement[] }> => {
            let [entrezIds, hugoIds] = _.partition(_.uniq(geneIds), isInteger);

            let getEntrezResults = async () => {
                let found: Gene[];
                if (entrezIds.length)
                    found = await client.fetchGenesUsingPOST({ geneIdType: "ENTREZ_GENE_ID", geneIds: entrezIds });
                else
                    found = [];
                let missingIds = _.difference(entrezIds, found.map(gene => gene.entrezGeneId + ''));
                let removals = missingIds.map(entrezId => ({ alias: entrezId, genes: [] }));
                let replacements = found.map(gene => ({ alias: gene.entrezGeneId + '', genes: [gene] }));
                let suggestions = [...removals, ...replacements];
                return { found, suggestions };
            };

            let getHugoResults = async () => {
                let found: Gene[];
                if (hugoIds.length)
                    found = await client.fetchGenesUsingPOST({ geneIdType: "HUGO_GENE_SYMBOL", geneIds: hugoIds });
                else
                    found = [];
                let missingIds = _.difference(hugoIds, found.map(gene => gene.hugoGeneSymbol));
                let suggestions = await Promise.all(missingIds.map(alias => this.getGeneSuggestions(alias)));
                return { found, suggestions };
            };

            let [entrezResults, hugoResults] = await Promise.all([getEntrezResults(), getHugoResults()]);
            return {
                found: [...entrezResults.found, ...hugoResults.found],
                suggestions: [...entrezResults.suggestions, ...hugoResults.suggestions]
            };
        },
        500
    );

    private readonly genes = remoteData({
        invoke: () => this.invokeGenesLater(this.geneIds),
        default: { found: [], suggestions: [] },
        onResult:(genes)=>{
            if (!this.oql.error && this.oql.query.length && !genes.suggestions.length)
            {
                this.props.updateSelectedGenes(this.oql.query,genes.found)
            }
        }
    });

    private validationStatus() {

        if (this.oql.error)
            return (
                <span className={styles.errorMessage}>
                    {`Cannot validate gene symbols because of invalid OQL. ${
                        this._geneQueryErrorDisplayStatus === 'unfocused'
                            ? "Please click 'Submit' to see location of error."
                            : this.oql.error.message
                        }`}
                </span>
            );

        if (!this.oql.query.length)
            return null;

        if (this.genes.isError)
            return (
                <span className={styles.pendingMessage}>
                    Unable to validate gene symbols.
                </span>
            );

        if (this.genes.isPending && this.genes.result.suggestions.length == 0)
            return (
                <span className={styles.pendingMessage}>
                    Validating gene symbols...
                </span>
            );

        if (this.genes.result.suggestions.length)
            return (
                <div style={{ display: 'flex' }}>
                    <div className={styles.invalidBubble} title="Please edit the gene symbols.">
                        <FontAwesome className={styles.icon} name='exclamation-circle' />
                        <span>Invalid gene symbols.</span>
                    </div>

                    {this.genes.result.suggestions.map(this.renderSuggestion, this)}
                </div>
            );

        return (
            <div className={styles.validBubble} title="You can now submit the list.">
                <FontAwesome className={styles.icon} name='check-circle' />
                <span>All gene symbols are valid.</span>
            </div>
        );
    }

    @action replaceGene(oldSymbol: string, newSymbol: string) {
        this._geneQuery = normalizeQuery(this._geneQuery.toUpperCase().replace(new RegExp(`\\b${oldSymbol.toUpperCase()}\\b`, 'g'), () => newSymbol.toUpperCase()));
    }

    renderSuggestion({ alias, genes }: GeneReplacement, key: number) {
        if (genes.length == 0) {
            let title = 'Could not find gene symbol. Click to remove it from the gene list.';
            let onClick = () => this.replaceGene(alias, '');
            return (
                <div key={key} className={styles.suggestionBubble} title={title} onClick={onClick}>
                    <FontAwesome className={styles.icon} name='times-circle' />
                    <span className={styles.noChoiceLabel}>{alias}</span>
                </div>
            );
        }

        if (genes.length == 1) {
            let { hugoGeneSymbol } = genes[0];
            let title = `'${alias}' is a synonym for '${hugoGeneSymbol}'. Click here to replace it with the official symbol.`;
            let onClick = () => this.replaceGene(alias, hugoGeneSymbol);
            return (
                <div key={key} className={styles.suggestionBubble} title={title} onClick={onClick}>
                    <FontAwesome className={styles.icon} name='question' />
                    <span className={styles.singleChoiceLabel}>{alias}</span>
                    <span>{`: ${hugoGeneSymbol}`}</span>
                </div>
            );
        }

        let title = 'Ambiguous gene symbol. Click on one of the alternatives to replace it.';
        let options = genes.map(gene => ({
            label: gene.hugoGeneSymbol,
            value: gene.hugoGeneSymbol
        }));
        return (
            <div key={key} className={styles.suggestionBubble} title={title}>
                <FontAwesome className={styles.icon} name='question' />
                <span className={styles.multiChoiceLabel}>{alias}</span>
                <span>{': '}</span>
                <ReactSelect
                    placeholder='select a symbol'
                    options={options}
                    onChange={option => option && this.replaceGene(alias, option.value)}
                    autosize
                />
            </div>
        );
    }

    render() {
        return (
            <div className={styles.genesSelection}>
                <textarea
                    ref={this.textAreaRef}
                    className={classnames(styles.geneSet, this.geneQuery ? styles.notEmpty : styles.empty)}
                    rows={5}
                    cols={80}
                    placeholder="Enter HUGO Gene Symbols or Gene Aliases"
                    title="Enter HUGO Gene Symbols or Gene Aliases"
                    value={this.geneQuery}
                    onChange={event => {

                        this.geneQuery = event.currentTarget.value
                    }
                    }
                    data-test='geneSet'
                />
                <div className={styles.validationStatus}>
                    {this.validationStatus()}
                </div>

            </div>
        )
    }
}