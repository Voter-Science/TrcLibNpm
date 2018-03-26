// Handle operations related to TRC sheets 

import * as core from 'trc-core/core'
import * as XC from 'trc-httpshim/xclient'

import { SheetContentsIndex, SheetContents, ISheetContents } from './sheetContents';


// Result of /sheet/{id}/info
export interface ISheetInfoResult {
    Name: string; // name of this sheet (ie, the precinct)
    ParentName: string;  // name of the group (ie, the campaign)
    ParentId: string; // sheet id of the parent. We may not have access to this. 
    LatestVersion: number;
    CountRecords: number; // number of rows. 

    // approximate coordinate for this sheet's average Lat/Long.
    // 0 if unavailable. 
    Latitute: number;
    Longitude: number;

    // unordered. Describes the columns in the sheet
    Columns: IColumnInfo[];
}

export interface IGetChildrenResult {
    ChildrenIds: IGetChildrenResultEntry[];
}

export interface IGetChildrenResultEntry {
    Id: string;

    // Filter expression. May be null.
    // could be:
    //  where x='y' select c1,c2,c3

    Filter: string;  // Filter expression
    Name: string;
}

export interface ICreateChildRequestFilter {
    // An expression 
    // see  https://github.com/Voter-Science/TrcLibNpm/wiki/Expressions
    WhereExpression: string;
}

export interface ICreateChildRequest {
    // Name of this sheet. This will go into the sheet metadata. 
    Name?: string;

    Filter: ICreateChildRequestFilter;

    // This is exclusive with filter. 
    // If this is set, then the Child specifically gets this subset of record Ids from the parent. 
    RecIds: string[];

    // Does the child get their own sandbox?  Or is this shared with the parent. 
    ShareSandbox: boolean;
}

// Result from creating a new sheet. 
// This is how we retrieve the SheetId 
interface IPutSheetResult {
    Id: string; // SheetId of new sheet
}


// After update a sheet, we get the new version number back.  
export interface IUpdateSheetResult {
    VersionTag: string; // should be an integer
}

// Type information about columns in the sheet.
// To aid editors. 
export interface IColumnInfo {
    Name: string; // Unique ID for this column. 
    DisplayName: string;
    Description: string;
    PossibleValues: string[]; // Important for multiple choice
    IsReadOnly: boolean;
    Type: string; // Text, MultipleChoice

    Semantic? : string;
    Expression?: string;
}


export interface IDeltaInfo {
    Version: number;
    User: string;

    // Optional Lat&Long from where the delta was made
    GeoLat: string;
    GeoLong: string;
    Timestamp: string; // datetime
    UserIp: string;
    App: string;

    Value: ISheetContents; // delta applied to the sheet
}


// resposne for /sheets/{id}/history/find
export interface IFindVersionResponse {
    VersionNumber: number;
}

export interface IHistorySegment extends core.ISegment<IDeltaInfo> {
}


export interface IRebaseHistoryItem {
    Version: number;
    ActualTime: Date;
    Comment: string;
}

export interface IRebaseHistorySegment extends core.ISegment<IRebaseHistoryItem> {
}


export interface IMaintenanceRequest {
    SheetId: string;

    Cookie: string;

    // Should match class name. 
    Kind: string; // RefreshContents

    Payload:
    IMaintenancePayloadAddColumns | IMaintenancePayloadRefresh; // more details, specific to Kind
}

export interface IMaintenancePayloadRefresh {
}

export interface IMaintenancePayloadAddColumns {
    Columns: IMaintenanceAddColumn[];
}

export interface IMaintenanceAddColumn {
    ColumnName: string; // Required, Canonical API name 
    Description: string; // Optional, human readable description 
    PossibleValues: string[]; // multiple choice answers
    SemanticName? : string; 
}

export interface IMaintenanceDeleteColumn {
    ColumnName: string; // Required, Canonical API name 
}

export class Validators {
    static _columnNameRegex: RegExp = new RegExp("^[a-zA-Z0-9_]+$");
    public static ValidateColumnName(name: string): void {
        if (name == null) {
            throw 'Column Name is missing';
        }
        if (!Validators._columnNameRegex.test(name)) {
            throw 'Column Name is not valid: ' + name;
        }
    }
    public static ValidateAddColumn(payload: IMaintenanceAddColumn): void {
        Validators.ValidateColumnName(payload.ColumnName);
        if (payload.Description != null) {
            if (payload.Description.length > 60) {
                throw "Description is too long for '" + payload.ColumnName + "'";
            }
        }
        if (payload.PossibleValues != null) {
            if (payload.PossibleValues.length > 15) {
                throw "Too many possible values in question '" + payload.ColumnName + "'";
            }
            for (var k in payload.PossibleValues) {
                var item = payload.PossibleValues[k];
                if (!item) {
                    throw "possible values can't be null in question '" + payload.ColumnName + "'";
                }
                if (item.length > 50) {
                    throw "Possible value is too long for '" + payload.ColumnName + "'";
                }
            }
        }
    }

}

export interface IMaintenanceStatus {
    // Null if no background maintenance op is running. 
    CurrentOp: string;
    Cookie: string;

    // $$$ These aren't filled in yet. 
    // Describing the last operation. 
    LastOp: string;
    LastCookie: string;
    LastOpSucceeded: boolean;
    LastOpMsg: string;
}


// Wrap a Custom data (like polygon)
export interface ICustomDataRequest {
    FriendlyName: string;
    Etag: string;

    // Custom user object payload 
    Value: any;
}

export interface IPostDataResponse {
    // NEw etag 
    Etag: string;

    DataId: string;
}

// Result of listing the custom data of a particular kind
export interface ICustomDataEntry {
    DataId: string;
    Name: string; // Friendly name
}
export interface ICustomDataList {
    Entries: ICustomDataEntry[];
}

// Payload value for ICustomDataRequest for a polygon. 
export var PolygonKind: string = "_polygon";
export interface IPolygonSchema {
    Lat: number[];
    Long: number[];
}

// IEnumerable<T> pattern on a ISegment<T> (with NextLink) 
// Caller did initial call to get first segment. 
// This is just walking the next links. 
class NextLinkEnumerable<T> implements core.IEnumerable<T>
{
    ForEach(handler: (item: T) => void): Promise<void> {

        return new Promise<void>(
            (
                resolve: () => void,
                reject: (error: any) => void
            ) => {
                var worker = (de: core.ISegment<T>) => {
                    var results = de.Results;
                    if (results != null) {
                        for (var i in results) {
                            var item = results[i];
                            try {
                                handler(item);
                            }
                            catch (e) {
                                reject(e);
                            }
                        }
                    }

                    if (de.NextLink != null) {
                        this._http.getAsync<core.ISegment<T>>(
                            de.NextLink
                        ).then((segment: core.ISegment<T>) => {
                            worker(segment)
                        }).catch(error => reject(error));
                    } else {
                        // done
                        resolve();
                    }
                } // end worker 

                worker(this._firstSegment);
            });
    }

    private _http: XC.XClient; // Has auth token 
    private _firstSegment: core.ISegment<T>;

    // Passed initial segment. NEed sheet forauth
    public constructor(
        firstSegment: core.ISegment<T>,
        http: XC.XClient) {
        this._firstSegment = firstSegment;
        this._http = http;
    }
}


// Expose key common operations for the TRC service
export class SheetClient {
    public _http: XC.XClient;
    public _sheetId: string;

    public constructor(http: XC.XClient, sheetId: string) {
        this._http = http;
        this._sheetId = sheetId;
    }

    // get the unqiue sheet Id. This will be a guid (not the friendly name).   
    public getId(): string {
        return this._sheetId;
    }

    // Get a child sheet reference given its sheetId.
    public getSheetById(idChild: string): SheetClient {
        return new SheetClient(this._http, idChild);
    }

    public getUrlBase(path: string = ""): XC.UrlBuilder {
        var url = new XC.UrlBuilder("/sheets/" + this._sheetId + path);
        return url;
    }

    public getInfoAsync(): Promise<ISheetInfoResult> {
        var url = this.getUrlBase("/info");
        return this._http.getAsync<ISheetInfoResult>(url);
    }


    // Get sheet contents as a Json object. 
    // WhereExpression is unescape- so avoid spaces and other characters.
    // SelectedColumns must exist. 
    // Failure case could be very common if there's an error in the filter expression. 
    // if version is specified, get at that specific version. Else, get the latest version.    
    public getSheetContentsAsync(
        whereExpression?: string,
        selectColumns?: string[],
        version?: number
    ): Promise<ISheetContents> {
        var url = this.getUrlBase();

        url.addQuery("filter", whereExpression);
        if (selectColumns != null && selectColumns != undefined) {
            url.addQuery("select", selectColumns.join());
        }
        url.addQuery("version", version);

        return this._http.getAsync<any>(url);
    }

    // Get the record Ids in this sheet. 
    // This can be more optimized than getting the entire sheet
    public getRecIdsAsync(): Promise<string[]> {
        var selectColumns = ["RecId"];
        return this.getSheetContentsAsync(null, selectColumns).then((contents) => {
            return contents["RecId"];
        });
    }

    public postUpdateSingleRowAsync(
        recId: string,
        columnNames: string[],
        newValues: string[]
    ): Promise<IUpdateSheetResult> {
        var body: ISheetContents = SheetContents.FromRow(recId, columnNames, newValues);
        return this.postUpdateAsync(body);
    }

    public postUpdateSingleCellAsync(
        recId: string,
        columnName: string,
        newValue: string
    ): Promise<IUpdateSheetResult> {
        var body: ISheetContents = SheetContents.FromSingleCell(recId, columnName, newValue);
        return this.postUpdateAsync(body);
    }

    // Append XLastModified,XLat,XLong

    public postUpdateAsync(
        values: ISheetContents
    ): Promise<IUpdateSheetResult> {
        var url = this.getUrlBase();
        return this._http.sendAsync<IUpdateSheetResult>("POST", url, values);
    }

    // Get range of deltas
    public getDeltaRangeAsync(
        startVersion?: number,
        endVersion?: number
    ): Promise<core.IEnumerable<IDeltaInfo>> {
        var uri = this.getUrlBase("/deltas");
        uri.addQuery("start", startVersion);
        uri.addQuery("end", endVersion);

        return this._http.getAsync<IHistorySegment>(uri).then(segment =>
            new NextLinkEnumerable<IDeltaInfo>(segment, this._http));
    }

    // Get single version change
    public getDeltaAsync(version: number): Promise<ISheetContents> {
        var uri = this.getUrlBase("/history/" + version);
        return this._http.getAsync<ISheetContents>(uri);
    }

    // Find the version number for the change right before this timestamp. 
    // -1 if none.
    public findVersionAsync(timestamp: Date): Promise<number> {
        var uri = this.getUrlBase("/history/find?timestamp=" + timestamp.toISOString());
        return this._http.getAsync<IFindVersionResponse>(uri).
            then(result => result.VersionNumber);
    }

    // Find the version number for the change right before this timestamp. 
    // -1 if none.
    public getRebaseLogAsync(): Promise<core.IEnumerable<IRebaseHistoryItem>> {
        var uri = this.getUrlBase("/history/rebase");
        return this._http.getAsync<IRebaseHistorySegment>(uri).
            then(segment => new NextLinkEnumerable<IRebaseHistoryItem>(segment, this._http));
    }

    public getChildrenAsync(): Promise<IGetChildrenResultEntry[]> {
        var uri = this.getUrlBase("/child");
        return this._http.getAsync<IGetChildrenResult>(uri).
            then(result => result.ChildrenIds);
    }

    // Base function to create a new child sheet. 
    public createChildSheet(body: ICreateChildRequest): Promise<SheetClient> {
        var uri = this.getUrlBase("/child");
        return this._http.postAsync<IPutSheetResult>(uri, body).
            then(result => this.getSheetById(result.Id));
    }

    public createChildSheetFromFilterAsync(
        name: string, // new sheet name
        whereExpression: string,
        sharesSandbox: boolean): Promise<SheetClient> {

        var body: ICreateChildRequest = {
            Name: name,
            Filter: {
                WhereExpression: whereExpression
            },
            RecIds: null,
            ShareSandbox: sharesSandbox,
        };
        return this.createChildSheet(body);
    }

    // also createChildSheetFromRecIds ? 

    // Server will do the permission checks here
    public deleteChildSheetAsync(childSheetId: string): Promise<void> {
        var uri = this.getUrlBase("/child/" + childSheetId);
        return this._http.deleteAsync(uri);
    }

    //
    // Custom data 
    //

    // _polygon is a well-known kind 
    public postCustomDataAsync(
        kind: string,
        dataId: string,
        body: ICustomDataRequest,
    ): Promise<IPostDataResponse> {
        var url = this.getUrlBase("/data/" + kind + "/" + dataId);
        return this._http.sendAsync<IPostDataResponse>("POST", url, body);
    }

    public getCustomDataAsync(
        kind: string,
        dataId: string
    ): Promise<ICustomDataRequest> {
        var url = this.getUrlBase("/data/" + kind + "/" + dataId);
        return this._http.getAsync<ICustomDataRequest>(url);
    }

    public deleteCustomDataAsync(
        kind: string,
        dataId: string
    ): Promise<void> {
        var url = this.getUrlBase("/data/" + kind + "/" + dataId);
        return this._http.deleteAsync(url);
    }

    public listCustomDataAsync(
        kind: string
    ): Promise<core.IEnumerable<ICustomDataEntry>> {
        var url = this.getUrlBase("/data/" + kind);
        return this._http.getAsync<ICustomDataList>(url).then(list => {
            return new core.ArrayEnumerable(list.Entries);
        });
    }
}

// ADministrative operations on a sheet 
export class SheetAdminClient {
    private _client: SheetClient;

    public constructor(sheetClient: SheetClient) {
        this._client = sheetClient;
    }

    // Create an expression column 
    public postNewExpressionAsync(
        name: string,
        expression: string
    ): Promise<void> {

        try {
            Validators.ValidateColumnName(name);
            // validation expression on client is too complex, let server handle it.

            var body: any = {
                Name: name,
                IsReadOnly: true,
                Expression: expression
            };

            var uri = this._client.getUrlBase("/columns/" + name);
            return this._client._http.postAsync(uri, body);
        }
        catch (error) {
            return Promise.reject(error);
        }
    }

    // Get the current maintenance operation status. 
    // USe this to determine if operations have finished processing
    public getOpStatusAsync(): Promise<IMaintenanceStatus> {
        var uri = this._client.getUrlBase("/ops");
        return this._client._http.getAsync<IMaintenanceStatus>(uri);
    }

    // Returns after the the operation is posted (queued). 
    // Call WAitAsync() to wait for it to execute. 
    private postOpAsync(kind: string,
        payload: IMaintenancePayloadRefresh | IMaintenancePayloadAddColumns
    ): Promise<void> {

        var body: IMaintenanceRequest = {
            SheetId: this._client._sheetId,
            Kind: kind,
            Cookie: null,
            Payload: payload
        };

        var uri = this._client.getUrlBase("/ops");
        return this._client._http.putAsync(uri, body); // no return result.
    }

    // Queue a refresh operation
    // This will happen asynchronous
    public postOpRefreshAsync(): Promise<void> {

        var payload: IMaintenancePayloadRefresh = {};
        return this.postOpAsync("RefreshContents", payload);
    }

    public postOpAddQuestionAsync(questions: IMaintenanceAddColumn[])
        : Promise<void> {
        var payload: IMaintenancePayloadAddColumns = {
            Columns: questions
        };
        try {
            for (var i in questions) {
                var item = questions[i];
                Validators.ValidateAddColumn(item);
            }
        }
        catch (error) {
            return Promise.reject(error);
        }
        return this.postOpAsync("AddColumns", payload);
    }

    public postOpDeleteQuestionAsync(columnName: string)
        : Promise<void> {
        var payload: IMaintenanceDeleteColumn = {
            ColumnName: columnName
        };
        return this.postOpAsync("DeleteColumn", payload);
    }

    // What for all current operations to be complete. 
    // This will poll every 5 seconds
    public WaitAsync(): Promise<void> {
        return new Promise<void>(
            (
                resolve: () => void,
                reject: (error: any) => void
            ) => {
                this.waitHelper(resolve, reject);
            }
        );
    }

    // Internal helper to do a promisified-poll. 
    private waitHelper(
        resolve: () => void,
        reject: (error: any) => void
    ) {
        this.getOpStatusAsync().then(value => {
            if (value.CurrentOp == null) {
                resolve();
                return;
            }
            // console.log(".");
            // try again 
            setTimeout(() => {
                this.waitHelper(resolve, reject);
            }, 5 * 1000);
        }).catch(err => reject(err));
    }
}
