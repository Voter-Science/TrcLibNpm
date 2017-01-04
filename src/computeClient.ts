// TRC compute 

import * as http from './httpshim';
import * as Promise from 'bluebird';

import * as trc from './trc2'; // $$$ decouple this. 

// $$$ Share these

export interface ISheetContents {
    [colName: string]: string[];
}


export interface ISegment<T> {
    ContinuationToken?: string;
    Results: T[];
}

// Error results from TRC. 
export interface ITrcError {
    Code: number; // http status code. 404, etc
    Message: string; // user message. 
    InternalDetails: string; // possible diagnostic details.
    CorrelationId: string; // for reporting to service. 
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
    public constructor(sheetRef: trc.ISheetReference) {
        this._authToken = sheetRef.AuthToken;
        this._httpClient = trc.StaticHelper.NewHttpClient(sheetRef.Server);
    }

    private _authToken: string;
    private _httpClient: http.HttpClient; // removes HTTPS prefix

    // Expose  helper. Called can make any call. Stamps with Bearer token.     
    protected httpGetDirectAsync(
        fullPath: string,  // like: /sheets/{id}/info     
        onSuccess: (result: any) => void, // callback invoked on success. Passed the body, parsed from JSON
        onFailure: (error: ITrcError) => void // callback inoked on failure
    ): void {
        this._httpClient.sendAsync(
            'GET',
            fullPath,
            null, // body, not  allowed on GET
            "Bearer " + this._authToken,
            null,
            onSuccess,
            onFailure
        );
    }

    // Expose  helper. Called can make any call. Stamps with Bearer token.  
    public httpPostDirectAsync(
        fullPath: string,  // like: /sheets/{id}/info
        body: any,
        onSuccess: (result: any) => void, // callback invoked on success. Passed the body, parsed from JSON
        onFailure: (error: ITrcError) => void // callback inoked on failure
    ): void {
        this._httpClient.sendAsync(
            'POST',
            fullPath,
            body,
            "Bearer " + this._authToken,
            null,
            onSuccess,
            onFailure
        );
    }


    public getSemanticsAsync(
        folder: string): Promise<string[]> {
        return new Promise<string[]>(
            (
                resolve: (result: string[]) => void,
                reject: (error: ITrcError) => void
            ) => {
                this.httpGetDirectAsync(
                    "/data/listdata?group=" + folder,

                    (response : IListResults) => resolve(response.Values), reject
                ); // callback inoked on failure.
            }
        );
    }

    public getSemanticSummary(
        semantic: string,
        callback: (result: IFileSummaryInfo) => void,
        onFailure: (error: ITrcError) => void
    ): void {
        this.httpGetDirectAsync(
            "/data/summary?semantic=" + semantic,
            (result: IFileSummaryInfo) => {
                callback(result);
            },
            onFailure
        ); // callback inoked on failure.
    }

    // 
    // Compute API 
    // 

    // List all existing ComputeSpecs  that the current user has access to
    public computeListAsync(): Promise<IComputeSpecSummary[]> {
        return new Promise<IComputeSpecSummary[]>(
            (
                resolve: (result: IComputeSpecSummary[]) => void,
                reject: (error: ITrcError) => void
            ) => {
                this.httpGetDirectAsync("/compute",
                    function (response: ISegment<IComputeSpecSummary>) {
                        resolve(response.Results);
                    },
                    reject
                );
            });
    }


    //  Create a new empty spec, return the specId
    public computeNewSpecAsync(
        name: string
    ): Promise<string> {
        return new Promise<string>(
            (
                resolve: (result: string) => void,
                reject: (error: ITrcError) => void
            ) => {
                this.httpPostDirectAsync("/compute/",
                    { Name: name }, // Create empty 
                    function (result: IComputeSpecHandle) {
                        resolve(result.SpecId);
                    },
                    reject
                );
            });
    }

    //  Get the raw contentes of the given spec Ud 
    public computeGetSpecRaw(
        specId: string,
        callback: (results: string) => void,
        onFailure: (error: ITrcError) => void
    ) {
        this.httpGetDirectAsync("/compute/" + specId + "?format=WrappedRawText",
            function (response) {
                var content = response.Contents;
                callback(content);
            },
            onFailure
        );
    }

    //  Get the raw contents of the given spec Id 
    public computePutSpecRaw(
        specId: string,
        content: string,
        callback: () => void,
        onFailure: (error: ITrcError) => void
    ) {
        this.httpPostDirectAsync("/compute/" + specId + "?format=WrappedRawText",
            { Contents: content }, // wrapper
            function () {
                callback();
            },
            onFailure
        );
    }

    // Run a compute 
    // Async long running model 
    public computeRunSpec(
        specId: string,
        callback: (handle: IComputeSpecHandle) => void,
        onFailure: (error: ITrcError) => void) {
        this.httpPostDirectAsync("/compute/" + specId + "/rerun",
            {},
            function (response: IComputeSpecHandle) {
                callback(response);
            },
            onFailure
        );
    }

    // Null result on callback  means to keep polling    
    public computeCheckRunResults(
        handle: IComputeSpecHandle,
        callback: (result: IComputeSpecResults) => void,
        onFailure: (error: ITrcError) => void
    ) {
        var url = "/compute/" + handle.SpecId + "/result/";
        if (handle.ResultId != null) {
            url += handle.ResultId;
        }

        // Use some TS trick? https://www.typescriptlang.org/docs/handbook/advanced-types.html
        this.httpGetDirectAsync(
            url,
            (result: IComputeSpecResults) => {
                var done = result.CompleteTime;
                if (done == undefined || done == null) {
                    callback(null); // location header means data not available yet. 
                }
                else {
                    callback(result);
                }
            },
            onFailure
        ); // callback inoked on failure.
    }

    // Fetch output from a compute
    public fetchOutput(handle: string,
        callback: (result: ISheetContents) => void,
        onFailure: (error: ITrcError) => void
    ) {
        this.httpGetDirectAsync(
            "/fetch/" + handle,
            (result: ISheetContents) => {
                callback(result);
            },
            onFailure
        ); // callback inoked on failure.
    }

}