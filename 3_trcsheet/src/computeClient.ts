// TRC compute 

import * as XC from 'trc-httpshim/xclient'

import { ISheetContents } from './sheetContents';
import { ITrcError } from 'trc-core/core';


// $$$ compared to other segment definition? 
export interface ISegment2<T> {
    ContinuationToken?: string;
    Results: T[];
}

// Compute client specific interfaces

export interface IComputeSpecSummary {
    SpecId: string; // primary  key for other compute operations
    Name?: string;
    Tags?: string;
    Status?: string; // Status string: None, Queued, Running, CompletedSuccess, Error
}

export interface IComputeSpec {
    Name?: string;
    Tags?: string;
    Ops: any[];
}

// handle for IComputeSpec while we wait for result
export interface IComputeSpecHandle {
    SpecId: string;
    ResultId: string; // unique for this execution instance
    //ResultsUri?: string; // Relative URL to query 
}

// Response from GET comnpute/{specId} ? format=WrappedRawText
export interface IComputeSpecContents
{
    Contents : string; // string contents
}

// Save
export interface IComputeSpecResultsOutput_Save extends IFileSummaryInfoEntry {
    Handle: string;
}

export interface IComputeSpecResults {
    Error: string;

    Outputs: {};


    CompleteTime?: Date;
    StartTime?: Date;
    QueueTime?: Date;
}

export interface IFileSummaryInfoEntry {
    Name: string;
    Sample: string;
    NonBlank: number; // # of non-blank values  
    Sum: number; // sum of numerical values 
    Unique?: number; // # of unique (case sensitive). Blankif too many. 
    UniqueCaseInsensitive?: number; // # of unique (case-sensitive)
}

export interface IFileSummaryInfo {
    Columns: IFileSummaryInfoEntry[];
    NumberRows: number;
}

export interface IListResults {
    Values: string[];
}



export class ComputeClient {
    private _http: XC.XClient;

    public constructor(http: XC.XClient) {
        this._http = http;
    }

    public getSemanticAsync(
        name: string): Promise<ISheetContents> {
var url = "/data/contents?name=" + name;
return this._http.getAsync<ISheetContents>(url);        
    }


    public getSemanticsAsync(
        folder: string): Promise<string[]> {

            var url = "/data/listdata?group=" + folder;
            return this._http.getAsync<IListResults>(url).then( result => result.Values);
    }

    public getSemanticSummaryAsync(
        semantic: string
    ): Promise<IFileSummaryInfo> {
        var url = "/data/summary?semantic=" + semantic;
        return this._http.getAsync<IFileSummaryInfo>(url);
    }

    // 
    // Compute API 
    // 

    // List all existing ComputeSpecs  that the current user has access to
    public listAsync(): Promise<IComputeSpecSummary[]> {

        var url = "/compute";

        // $$$ iterate segment. 
        return this._http.getAsync<ISegment2<IComputeSpecSummary>>(url).then(segment => segment.Results);
    }


    //  Create a new empty spec, return the specId
    public newSpecAsync(
        name: string
    ): Promise<string> {
        var url = "/compute/";
        var body =  { Name: name }; // Create empty
        return this._http.postAsync<IComputeSpecHandle>(url, body).then(result => result.SpecId);
    }

    //  Get the raw contentes of the given spec Ud 
    public getSpecContentsAsync(
        specId: string
    ): Promise<string> {

        var url = "/compute/" + specId + "?format=WrappedRawText";
        return this._http.getAsync<IComputeSpecContents>(url).then(
            result => result.Contents);
    }

    //  Get the raw contents of the given spec Id 
    public putSpecContentsAsync(
        specId: string,
        content: string
    ): Promise<void> {

        var url= "/compute/" + specId + "?format=WrappedRawText";
        var body : IComputeSpecContents = {
            Contents : content
        };
        return this._http.postAsync(url, body);
        }

    // Run a compute 
    // Async long running model 
    public runSpecAsync(
        specId: string
    ): Promise<IComputeSpecHandle> {
        var url = "/compute/" + specId + "/rerun";
        var body = { };
        return this._http.postAsync<IComputeSpecHandle>(url, body);        
    }

    // Null result on callback  means to keep polling    
    public getRunResultsAsync(
        handle: IComputeSpecHandle
    ): Promise<IComputeSpecResults> {

        var url = "/compute/" + handle.SpecId + "/result/";
        if (handle.ResultId != null) {
            url += handle.ResultId;
        }

        return this._http.getAsync<IComputeSpecResults>(url).then(
            result => {
                var done = result.CompleteTime;
                if (!done) 
                {
                    result = null;
                }
                return result;
            }
        )    
    }

    // Fetch output from a compute
    public getOutputAsync(
        contentsHandle: string
    ): Promise<ISheetContents> {
        var url = "/fetch/" + contentsHandle;
        return this._http.getAsync<ISheetContents>(url);
    }

}