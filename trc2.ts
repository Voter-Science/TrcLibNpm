/// <reference path="./typings/modules/bluebird/index.d.ts" />

// TypeScript
// General purpose TypeScript definitions for using TRC
// This is the most fundamental module, and then other modules can build on this.

// Browser & Node mode. Browser would like to use $ from Jquery, as it's already loaded.
declare var require: any;

// Shim Http client. In node, this pulls in 'http' and 200k of modules. In browser, we get a tiny client on $jquery and save 200k.   
import * as http from './httpshim';
import * as Promise from 'bluebird';

interface IGeoPoint {
    Lat: number;
    Long: number;
}

//---------------------------------------------------------
// Used for TrcWeb plugin model.  

export interface IPluginOptions {
    // If set, starting recId to display
    recId: string;

    // UrlBase for jumping to another plugin.    
    gotoUrl: string;
}

interface IGotoLinkOptions {
    //
    // Options once we find a plugin:

    // If set, jump to this recId (if the target plugin supports it)
    recId?: string;

    //
    // Which plugin?
    // Either all (_), filter to tags, or use an explicit plugin. 

    // If set, comma delimited list of tags to filter plugin selection to 
    tags?: string;

    // If set, jump to this specific plugin. 
    plugin?: string;

    //
    // Which sheet?

    // If set, jump to this sheet id. Else jump the 'current' id. 
    sheetId?: string;
}

export class PluginOptionsHelper {
    private _opts: IPluginOptions;
    private _currentSheetId: string;

    // Static helper so we can normalize missing option values.
    // Take the current sheet so we can get its SheetId and use that 
    // to construct callback Urls.  
    public static New(opts: IPluginOptions, currentSheet: Sheet) {
        if (opts == null || opts == undefined) {
            opts = {
                recId: null,
                gotoUrl: ""
            }
        }
        var oh = new PluginOptionsHelper();
        oh._opts = opts;
        oh._currentSheetId = currentSheet.getId();
        return oh;
    }

    public getGotoLink(p: IGotoLinkOptions): string {
        var sheetId = this._currentSheetId;
        if (p.sheetId != undefined) {
            sheetId = p.sheetId;
        }
        var plugin = "_";
        if (p.plugin != undefined) {
            plugin = p.plugin;
        }

        var uri = this._opts.gotoUrl + "/" + sheetId + "/" + plugin + "/index.html";


        if (p.recId != undefined) {
            uri = StaticHelper.addQuery(uri, "recId", p.recId);
            p.tags = "_single";
        }

        if (plugin == "_") {
            if (p.tags != undefined) {
                uri = StaticHelper.addQuery(uri, "tags", p.tags);
            }
        }

        return uri;
    }

    public getStartupRecId(): string {
        var r = this._opts.recId;
        if (r == undefined) {
            return null;
        }
        return r;
    }
}


//--------------------------------------------------------- 
// direct REST definitions 
//

export interface IUserInfo {
    // User name, likely an email. 
    Name : string;

    // If provided, the topmost SheetId that this user has access to.
    SheetId : string;
}

// The response back from a login. This provides access to a sheet. 
export interface ISheetReference {
    // The auth parameter for accessing this sheet. scheme is 'Bearer'
    AuthToken: string;

    // The URL endpoint to access this sheet at. This may be different than the login server. 
    Server: string;

    // The unique Sheet Identifier for accessing this sheet. 
    SheetId: string;
}

// The sheet contents. 
// Column-major order. 
// Dictionary ColumnNames(string) --> values (string[int i])
export interface ISheetContents {
    [colName: string]: string[];
}

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

interface IHistorySegment {
    NextLink: string; // relative link to get next set of results  
    Results: IDeltaInfo[];
}

// resposne for /sheets/{id}/history/find
interface IFindVersionResponse
{            
    VersionNumber: number;
}

export interface IGetChildrenResultEntry {
    Id: string;

    // Filter expression. May be null.
    // could be:
    //  where x='y' select c1,c2,c3

    Filter: string;  // Filter expression
    Name: string;
}

export interface IGetChildrenResult {
    ChildrenIds: IGetChildrenResultEntry[];
}

// Result from creating a new share code
interface IShareSheetResult {
    Code: string;
    Email: string;
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

// Payload value for ICustomDataRequest for a polygon. 
export var PolygonKind: string = "_polygon";
export interface IPolygonSchema {
    Lat: number[];
    Long: number[];
}

// Result of listing the custom data of a particular kind
export interface ICustomDataEntry {
    DataId: string;
    Name: string; // Friendly name
}
export interface ICustomDataList {
    Entries: ICustomDataEntry[];
}

// Error results from TRC. 
export interface ITrcError {
    Code: number; // http status code. 404, etc
    Message: string; // user message. 
    InternalDetails: string; // possible diagnostic details.
    CorrelationId: string; // for reporting to service. 
}

//---------------------------------------------------------
// Helpers 
// 

// Helper for maintaining a RecId --> Index mapping over a sheet. 
export class SheetContentsIndex {
    private _map: any = {};
    private _source: ISheetContents;

    public constructor(source: ISheetContents) {
        this._source = source;
        var cRecId = source["RecId"];
        for (var i = 0; i < cRecId.length; i++) {
            var recId = cRecId[i];
            this._map[recId] = i;
        }
    }

    // Get the index into the source. 
    public lookupRecId(recId: string): number {
        var idx = this._map[recId];
        if (idx == undefined) {
            return -1;
        }
        return idx;
    }

    public set(recId: string, columnName: string, newValue: string): void {
        var idx = this.lookupRecId(recId);
        if (idx != -1) {
            this._source[columnName][idx] = newValue;
        }
    }

    public getContents(): ISheetContents {
        return this._source;
    }
}

// Helpers for manipulating ISheetContent
export class SheetContents {
    // Get a reverse lookup map
    // Place here for discoverability 
    public static getSheetContentsIndex(source: ISheetContents): SheetContentsIndex {
        return new SheetContentsIndex(source);
    }

    // Convert an ISheetContents to a CSV. 
    public static toCsv(data: ISheetContents): string {
        let colKeys: string[] = Object.keys(data);
        let grid: string[][] = [];
        let rowCount = data[colKeys[0]].length;
        let index = 0;

        grid.push(colKeys);

        while (index < rowCount) {
            let row: string[] = [];
            for (let colKey of colKeys) {
                var direct = data[colKey][index];
                var val : string;
                if (direct == null || direct == undefined) {
                    val = "";
                } else {
                    val = direct.toString();
                    try {
                        // Escape commas. 
                        val = val.replace("\"", "'");
                        if (val.indexOf(",") >= 0) {
                            val = "\"" + val + "\"";
                        }
                    }
                    catch (e) {
                        val = "???";
                    }                    
                }
                row.push(val);
            }
            grid.push(row);
            index++;
        }

        let content = "";

        grid.forEach((arr, index) => {
            let row = arr.join(",");
            content += index < grid.length ? row + "\r\n" : row;
        });
        return content;
    }

    // Helper to enumerate through each cell in a sheet and invoke a callback
    public static ForEach(
        source: ISheetContents,
        callback: (recId: string, columnName: string, newValue: string) => void): void {
        var colRecId = source["RecId"];
        for (var columnName in source) {
            var column = source[columnName];
            if (column == colRecId) {
                continue;
            }
            for (var i = 0; i < column.length; i++) {
                var recId = colRecId[i];
                var newValue = column[i];

                callback(recId, columnName, newValue);
            }
        }
    }

    public static FromSingleCell(
        recId: string,
        columnName: string,
        newValue: string): ISheetContents {
        var body: ISheetContents = {};
        body["RecId"] = [recId];
        body[columnName] = [newValue];
        return body;
    }

    public static FromRow(
        recId: string,
        columnNames: string[],
        newValues: string[]): ISheetContents {
        if (columnNames.length != newValues.length) {
            throw "length mismatch";
        }
        var body: ISheetContents = {};
        body["RecId"] = [recId];
        for (var i = 0; i < columnNames.length; i++) {
            var columnName = columnNames[i];
            var newValue = newValues[i];
            body[columnName] = [newValue];
        }
        return body;
    }

    // applies fpInclude on each row in source sheet. 
    // Returns a new sheet with same columns, but is a subset.
    public static KeepRows(
        source: ISheetContents,
        fpInclude: (idx: number) => boolean
    ): ISheetContents {
        var columnNames: string[] = [];
        var results: ISheetContents = {};
        for (var columnName in source) {
            columnNames.push(columnName);
            results[columnName] = [];
        }

        var cRecId: string[] = source["RecId"];
        //for(var iRow  in cRecId)
        for (var iRow = 0; iRow < cRecId.length; iRow++) {
            var keepRow: boolean = fpInclude(iRow);
            if (keepRow) {
                for (var x in columnNames) {
                    var columnName = columnNames[x];
                    var val = source[columnName][iRow];
                    results[columnName].push(val)
                }
            }
        }
        return results;
    }
}


//---------------------------------------------------------
// Private helpers 
class StaticHelper {
    private static startsWith(str: string, word: string): boolean {
        return str.lastIndexOf(word, 0) === 0;
    }

    public static NewHttpClient(url: string): http.HttpClient {
        if (StaticHelper.startsWith(url, "https://")) {
            var host = url.substr(8);
            return new http.HttpClient("https", host);
        }
        if (StaticHelper.startsWith(url, "http://")) {
            var host = url.substr(7);
            return new http.HttpClient("http", host);
        }
        throw "Invalid url protocol: " + url;
    }

    // Get a sheet ref given a sheet ID and auth token. 
    public static trcGetSheetRef(
        sheetId: string,
        original: ISheetReference
    ): ISheetReference {
        return {
            AuthToken: original.AuthToken,
            Server: original.Server,
            SheetId: sheetId
        };
    }

    public static addQuery(q: string, key: string, value: string): string {
        if (value == null || value == undefined) {
            return q;
        }
        if (q == null || q == undefined) {
            q = "";
        }
        if (q.length == 0) {
            q = q + "?";
        } else {
            q = q + "&";
        }
        q = q + key + "=" + encodeURIComponent(value);
        return q;
    }

}

interface ICreateChildRequestFilter {
    // An expression 
    // see  https://github.com/Voter-Science/TrcLibNpm/wiki/Expressions
    WhereExpression: string;
}

interface ICreateChildRequest {
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



//---------------------------------------------------------
// Wrapper classes for client objects
//

// TRC Sheet
// - Info - this includes Column information and children.  
// - Contents - the actual data. This could be huge.
export class Sheet {
    private _sheetRef: ISheetReference;
    private _httpClient: http.HttpClient; // removes HTTPS prefix

    constructor(sheetRef: ISheetReference) {
        this._sheetRef = sheetRef;
        this._httpClient = StaticHelper.NewHttpClient(sheetRef.Server);
    }

    // Wrapper
    private httpPostAsync(
        path: string,  // like: /info
        body: any,
        onSuccess: (result: any) => void, // callback invoked on success. Passed the body, parsed from JSON
        onFailure: (statusCode: ITrcError) => void, // callback invoked on failure
        geo: IGeoPoint
    ) {
        this._httpClient.sendAsync(
            'POST',
            "/sheets/" + this._sheetRef.SheetId + path,
            body, // body, not  allowed on GET
            "Bearer " + this._sheetRef.AuthToken,
            geo,
            onSuccess,
            onFailure
        );
    }

    private httpPatchAsync(
        path: string,  // like: /info
        body: any,
        onSuccess: (result: any) => void, // callback invoked on success. Passed the body, parsed from JSON
        onFailure: (statusCode: ITrcError) => void, // callback inoked on failure
        geo: IGeoPoint
    ) {
        this._httpClient.sendAsync(
            'PATCH',
            "/sheets/" + this._sheetRef.SheetId + path,
            body, // body, not  allowed on GET
            "Bearer " + this._sheetRef.AuthToken,
            geo,
            onSuccess,
            onFailure
        );
    }

    // Expose  helper. Called can make any call. Stamps with Bearer token.  
    public httpGetDirectAsync(
        fullPath: string,  // like: /sheets/{id}/info     
        onSuccess: (result: any) => void, // callback invoked on success. Passed the body, parsed from JSON
        onFailure: (error: ITrcError) => void // callback inoked on failure
    ) : void {
        this._httpClient.sendAsync(
            'GET',
            fullPath,
            null, // body, not  allowed on GET
            "Bearer " + this._sheetRef.AuthToken,
            null,
            onSuccess,
            onFailure
        );
    }

    // Wrapper
    private httpGetAsync(
        path: string,  // like: /info     
        onSuccess: (result: any) => void, // callback invoked on success. Passed the body, parsed from JSON
        onFailure: (error: ITrcError) => void // callback inoked on failure
    ) {
        this._httpClient.sendAsync(
            'GET',
            "/sheets/" + this._sheetRef.SheetId + path,
            null, // body, not  allowed on GET
            "Bearer " + this._sheetRef.AuthToken,
            null,
            onSuccess,
            onFailure
        );
    }

    // Wrapper
    private httpDeleteAsync(
        path: string,  // like: /info     
        onSuccess: (result: any) => void, // callback invoked on success. Passed the body, parsed from JSON
        onFailure: (error: ITrcError) => void // callback inoked on failure
    ) {
        this._httpClient.sendAsync(
            'DELETE',
            "/sheets/" + this._sheetRef.SheetId + path,
            null, // body, not  allowed on GET
            "Bearer " + this._sheetRef.AuthToken,
            null,
            onSuccess,
            onFailure
        );
    }

    // get the unqiue sheet Id. This will be a guid (not the friendly name).   
    public getId(): string {
        return this._sheetRef.SheetId;
    }

    // Get a child sheet reference given its sheetId.
    public getSheetById(idChild: string): Sheet {
        var otherRef = StaticHelper.trcGetSheetRef(idChild, this._sheetRef);
        return new Sheet(otherRef);
    }

    // Get information about the access token 
    public getUserInfo(callback: (info: IUserInfo) => void) {
        this.httpGetDirectAsync("/userinfo",
            function (info: IUserInfo) {
                callback(info);
            },
            () => { } // callback inoked on failure 
        );
    }

    // Get information about this sheet. 
    public getInfo(callback: (result: ISheetInfoResult) => void) {
        this.httpGetAsync("/info",
            function (info: ISheetInfoResult) {
                callback(info);
            },
            () => { } // callback inoked on failure 
        );
    }

    public getInfoAsync():Promise<ISheetInfoResult> {
        return new Promise<ISheetInfoResult>((resolve:(result:ISheetInfoResult)=>void, reject:(error:ITrcError)=>void)=>{
            this.httpGetAsync("/info", resolve, reject);
        });
    }

    // Get sheet contents as a Json object. 
    // WhereExpression is unescape- so avoid spaces and other characters.
    // Failure case could be very common if there's an error in the filter expression. 
    // if version is specified, get at that specific version. Else, get the latest version.  
    public getSheetContents(
        successFunc: (data: ISheetContents) => void,
        whereExpression?: string,
        selectColumns?: string[],
        onFailure?: (error: ITrcError) => void,
        version? : number 
    ): void {

        var q: string = "";
        q = StaticHelper.addQuery(q, "filter", whereExpression);
        if (selectColumns != null && selectColumns != undefined) {
            q = StaticHelper.addQuery(q, "select", selectColumns.join());
        }
        if (version != undefined) {
            q = StaticHelper.addQuery(q, "version", version.toString());
        }

        if (onFailure == undefined) {
            onFailure = (error) => { };
        }

        this.httpGetAsync(q,
            successFunc,
            onFailure);
    }

    public getSheetContentsAsync(
        whereExpression?: string, 
        selectColumns?: string[], 
        version?:number):Promise<ISheetContents> {
            return new Promise<ISheetContents>((resolve:(result:ISheetContents)=>void, reject:(error:ITrcError)=>void)=> {
        
        var q: string = "";
        q = StaticHelper.addQuery(q, "filter", whereExpression);
        if (selectColumns != null && selectColumns != undefined) {
            q = StaticHelper.addQuery(q, "select", selectColumns.join());
        }
        if (version != undefined) {
            q = StaticHelper.addQuery(q, "version", version.toString());
        }

        this.httpGetAsync(q,
            resolve,
            reject);
        });
    }

    // Get the record Ids in this sheet. 
    // This can be more optimized than getting the entire sheet
    public getRecIds(
        successFunc: (recids: string[]) => void
    ) {
        var filter = "?Select=RecId";

        this.httpGetAsync(filter,
            successFunc,
            () => { });
    }

    public getRecIdsAsync():Promise<ISheetContents> {
        return new Promise<ISheetContents>((resolve:(result:ISheetContents)=>void, reject:(error:ITrcError)=>void)=> {
            var filter = "?Select=RecId";

            this.httpGetAsync(filter, resolve, reject);          
        });
    }

    // Update a single cell.
    public postUpdateSingleCell(
        recId: string,
        columnName: string,
        newValue: string,
        successFunc: (result: IUpdateSheetResult) => void,
        geo: IGeoPoint
    ): void {
        var body: ISheetContents = SheetContents.FromSingleCell(recId, columnName, newValue);
        this.postUpdate(body, successFunc, geo);
    }

    public postUpdateSingleCellAsync(
        recId: string, 
        columnName: string, 
        newValue: string, 
        geo:IGeoPoint):Promise<IUpdateSheetResult> {
        
        return new Promise<IUpdateSheetResult>((resolve:(result:IUpdateSheetResult)=>void, reject:(error:ITrcError)=>void)=> {
            var body: ISheetContents = SheetContents.FromSingleCell(recId, columnName, newValue);
            this.postUpdate(body, resolve, geo);
        });
    }

    // Update multiple columns in a single row 
    public postUpdateSingleRow(
        recId: string,
        columnNames: string[],
        newValues: string[],
        successFunc: (result: IUpdateSheetResult) => void,
        geo: IGeoPoint
    ): void {
        var body: ISheetContents = SheetContents.FromRow(recId, columnNames, newValues);
        this.postUpdate(body, successFunc, geo);
    }

    public postUpdateSingleRowAsync(
        recId: string,
        columnNames: string[],
        newValues: string[],
        geo: IGeoPoint
    ): Promise<IUpdateSheetResult> {
        return new Promise<IUpdateSheetResult>((resolve:(result:IUpdateSheetResult)=>void, reject:(error:ITrcError)=>void)=> {
            var body: ISheetContents = SheetContents.FromRow(recId, columnNames, newValues);
            this.postUpdate(body, resolve, geo);
        });
    }

    // Update multiple rows. 
    // Expected that SheetContents['RecId'] is set. 
    public postUpdate(
        values: ISheetContents,
        successFunc: (result: IUpdateSheetResult) => void,
        geo: IGeoPoint
    ) {
        this.httpPostAsync("",
            values,
            successFunc,
            () => { },
            geo);
    }

    public postUpdateAsync(
        values: ISheetContents,
        geo: IGeoPoint
    ):Promise<IUpdateSheetResult> {
        return new Promise<IUpdateSheetResult>((resolve:(result:IUpdateSheetResult)=>void, reject:(error:ITrcError)=>void)=> {
            this.httpPostAsync("",
            values, resolve, reject, geo);
        });        
    }

    // Find the version number for the change right before this timestamp. 
    // -1 if none.
    public findVersion(
        timestamp : Date,
        successFunc: (version: number) => void,
        failureFunc: (error: ITrcError) => void
    ): void {
        this.httpGetAsync(
            "/history/find?timestamp=" + timestamp.toISOString(),
            (result : IFindVersionResponse) => {
                successFunc(result.VersionNumber);
            },
            failureFunc);
    }

    public findVersionAsync(timestamp : Date):Promise<number> {
        return new Promise<number>((resolve:(result:number)=>void, reject:(error:ITrcError)=>void)=> {
            this.httpGetAsync(
            "/history/find?timestamp=" + timestamp.toISOString(),
            (result:IFindVersionResponse)=> { resolve(result.VersionNumber); }, reject);
        });
    }

    // Get single version change
    public getDelta(
        version: number,
        successFunc: (result: ISheetContents) => void,
        failureFunc: (error: ITrcError) => void
    ): void {
        this.httpGetAsync(
            "/history/" + version,
            successFunc,
            failureFunc);
    }

    public getDeltaAsync(version: number):Promise<ISheetContents> {
        return new Promise<ISheetContents>((resolve:(result:ISheetContents)=>void, reject:(error:ITrcError)=>void)=> {
            this.httpGetAsync(
            "/history/" + version,
            resolve, reject);
        });        
    }

    // Get all the deltas for this sheet.  
    public getDeltas(
        successFunc: (segment: DeltaEnumerator) => void,
        startVersion? : number,
        endVersion? :number
    ) {
        var uri = "/deltas";
        var query :string = "";
        if (startVersion != undefined) {
             query = StaticHelper.addQuery( query, "start", startVersion.toString());
        }
        if (endVersion != undefined) {
             query = StaticHelper.addQuery( query, "end", endVersion.toString());
        }

        this.httpGetAsync(
            uri + query,
            (segment : IHistorySegment) => {
                var e = new DeltaEnumerator(segment, this);
                successFunc(e);
            },
            () => { });
    }

    public getDeltasAsync(
        startVersion? : number,
        endVersion? :number):Promise<DeltaEnumerator> {
        
        return new Promise<DeltaEnumerator>((resolve:(result:DeltaEnumerator)=>void, reject:(error:ITrcError)=>void)=> {
            var uri = "/deltas";
            var query :string = "";
            if (startVersion != undefined) {
                query = StaticHelper.addQuery( query, "start", startVersion.toString());
            }
            if (endVersion != undefined) {
                query = StaticHelper.addQuery( query, "end", endVersion.toString());
            }

            this.httpGetAsync(
                uri + query,
                (segment : IHistorySegment) => {
                    var e = new DeltaEnumerator(segment, this);
                    resolve(e);
                },
                reject);
        });
    }

    // Common helper 
    public getChildren(
        successFunc: (result: IGetChildrenResultEntry[]) => void) {
        this.httpGetAsync(
            "/child",
            (result: IGetChildrenResult) => {
                successFunc(result.ChildrenIds);
            },
            () => { }
        );
    }

    public getChildrenAsync():Promise<IGetChildrenResultEntry[]> {
        return new Promise<IGetChildrenResultEntry[]>((resolve:(result:IGetChildrenResultEntry[])=>void, reject:(error:ITrcError)=>void)=> {
            this.httpGetAsync(
                "/child",
                (result: IGetChildrenResult) => {
                    resolve(result.ChildrenIds);
                },
                reject
            );
        });
    }

    // Helper to create a child sheet based on a filter.
    public createChildSheetFromFilter(
        name: string,
        whereExpression: string,
        sharesSandbox: boolean,
        successFunc: (result: Sheet) => void,
        failureFunc: (error: ITrcError) => void
    ): void {
        var body: ICreateChildRequest = {
            Name: name,
            Filter: {
                WhereExpression: whereExpression
            },
            RecIds: null,
            ShareSandbox: sharesSandbox,
        };

        this.createChildSheet(body, successFunc, failureFunc);
    }

    public createChildSheetFromFilterAsync(
        name: string,
        whereExpression: string,
        sharesSandbox: boolean):Promise<Sheet> {
        
        return new Promise<Sheet>((resolve:(result:Sheet)=>void, reject:(error:ITrcError)=>void)=> {
            var body: ICreateChildRequest = {
                Name: name,
                Filter: {
                    WhereExpression: whereExpression
                },
                RecIds: null,
                ShareSandbox: sharesSandbox,
            };

            this.createChildSheet(body, resolve, reject);
        });
    }

    public createChildSheetFromRecIds(
        name: string,
        recIds: string[],
        successFunc: (result: Sheet) => void,
        failureFunc: (error: ITrcError) => void
    ): void {
        var body: ICreateChildRequest = {
            Name: name,
            Filter: null,
            RecIds: recIds,
            ShareSandbox: true,
        };

        this.createChildSheet(body, successFunc, failureFunc);
    }

    public createChildSheetFromRecIdsAsync(
        name: string,
        recIds: string[]
        ):Promise<Sheet> {
        
        return new Promise<Sheet>((resolve:(result:Sheet)=>void, reject:(error:ITrcError)=>void)=> {
            var body: ICreateChildRequest = {
                Name: name,
                Filter: null,
                RecIds: recIds,
                ShareSandbox: true,
            };

            this.createChildSheet(body, resolve, reject);
        });
    }

    // Common helper 
    public createChildSheet(
        body: ICreateChildRequest,
        successFunc: (result: Sheet) => void,
        failureFunc: (error: ITrcError) => void) {
        this.httpPostAsync(
            "/child",
            body,
            (result: IPutSheetResult) => {
                var childSheet = this.getSheetById(result.Id);
                successFunc(childSheet);
            },
            failureFunc,
            null);
    }

    public createChildSheetAsync(body: ICreateChildRequest):Promise<Sheet> {
        return new Promise<Sheet>((resolve:(result:Sheet)=> void, reject:(error:ITrcError)=>void)=> {
            this.httpPostAsync(
            "/child",
            body,
            (result: IPutSheetResult) => {
                var childSheet = this.getSheetById(result.Id);
                resolve(childSheet);
            },
            reject,
            null);
        });
    }

    // For a sheet previously created by createChildSheetFromRecIds, 
    // Change the set of RecIds in a child sheet.  
    public patchChildSheetFromRecIds(
        childSheetId: string,
        recIds: string[],
        successFunc: () => void
    ): void {
        var body: ICreateChildRequest = {
            Name: name,
            Filter: null,
            RecIds: recIds,
            ShareSandbox: true,
        };

        this.httpPatchAsync(
            "/child/" + childSheetId,
            body,
            (result) => {
                successFunc();
            },
            () => { },
            null);
    }

    public patchChildSheetFromRecIdsAsync(
        childSheetId: string,
        recIds: string[]):Promise<any> {

        return new Promise((resolve:(result:any)=>void, reject:(error:ITrcError)=>void)=> {
            var body: ICreateChildRequest = {
                Name: name,
                Filter: null,
                RecIds: recIds,
                ShareSandbox: true,
            };

            this.httpPatchAsync(
                "/child/" + childSheetId,
                body, resolve, reject, null);
        });
    }

    // Parent has permission to delete child.
    public deleteChildSheet(
        childSheetId: string,
        successFunc: () => void,
        failureFunc: (error: ITrcError) => void
    ) {
        this.httpDeleteAsync(
            "/child/" + childSheetId,
            (result) => {
                successFunc();
            },
            failureFunc);
    }

    public deleteChildSheetAsync(
        childSheetId:string):Promise<any> {

        return new Promise<any>((resolve:(result:any)=>void, reject:(error:ITrcError)=>void)=> {
            this.httpDeleteAsync(
                "/child/" + childSheetId,
                resolve, reject);
        });
    }

    // Create a new share code exposes access to this sheet.
    // If the share already exists to this email address, it will return the same code.  
    public createShareCode(
        email: string,
        requireFacebook: boolean,
        successFunc: (code: string) => void
    ): void {
        var q: string = "/share?email=" + email;
        if (requireFacebook) {
            q += "&fbid=*";
        }

        this.httpPostAsync(
            q,
            null,
            (result: IShareSheetResult) => {
                successFunc(result.Code);
            },
            () => { },
            null);
    }

    public createShareCodeAsync(
        email:string,
        requireFacebook:boolean
    ):Promise<string> {
        return new Promise<string>((resolve:(result:string)=>void, reject:(error:ITrcError)=>void)=> {
            var q: string = "/share?email=" + email;
            if (requireFacebook) {
                q += "&fbid=*";
            }

            this.httpPostAsync(
                q,
                null,
                (result: IShareSheetResult) => {
                    resolve(result.Code);
                }, reject, null);
        });
    }

    // "_polygon" is a well-known kind 
    public postCustomData(
        kind: string,
        dataId: string,
        body: ICustomDataRequest,
        success: (result: IPostDataResponse) => void
    ): void {
        var q = "/data/" + kind + "/" + dataId;
        this.httpPostAsync(
            q,
            body,
            (result: IPostDataResponse) => {
                success(result);
            },
            () => { },
            null);
    }

    public postCustomDataAsync(
        kind: string,
        dataId: string,
        body: ICustomDataRequest
    ):Promise<IPostDataResponse> {
        return new Promise<IPostDataResponse>((resolve:(result:IPostDataResponse)=>void, reject:(error:ITrcError)=>void)=> {
            var q = "/data/" + kind + "/" + dataId;
            this.httpPostAsync(
                q, body, resolve, reject, null);
        });
    }

    public getCustomData(
        kind: string,
        dataId: string,
        success: (result: ICustomDataRequest) => void
    ): void {
        var q = "/data/" + kind + "/" + dataId;
        this.httpGetAsync(
            q,
            (result: ICustomDataRequest) => {
                success(result);
            },
            (statusCode) => {
                success(null); // Really should only do this for 404s
            });
    }

    public getCustomDataAsync(kind:string, dataId:string):Promise<ICustomDataRequest> {
        return new Promise<ICustomDataRequest>((resolve:(result:ICustomDataRequest)=>void, reject:(error:ITrcError)=>void)=>{
            var q = "/data/" + kind + "/" + dataId;
            this.httpGetAsync(
                q, resolve, reject);
        });
    }

    public deleteCustomData(
        kind: string,
        dataId: string,
        success: () => void
    ): void {
        var q = "/data/" + kind + "/" + dataId;
        this.httpDeleteAsync(
            q,
            () => {
                success(); // includes if not found
            },
            (statusCode) => { });
    }

    public deleteCustomDataAsync(kind:string, dataId:string):Promise<any> {
        return new Promise<any>((resolve:(result:any)=>void, reject:(error:ITrcError)=>void)=> {
            var q = "/data/" + kind + "/" + dataId;
            this.httpDeleteAsync(
                q, resolve, reject);
        });
    }

    public listCustomData(
        kind: string,
        success: (result: ICustomDataEntry[]) => void
    ): void {
        var q = "/data/" + kind;
        this.httpGetAsync(
            q,
            (result: ICustomDataList) => {
                success(result.Entries);
            },
            (statusCode) => { });
    }

    public listCustomDataAsync(kind:string):Promise<ICustomDataEntry[]> {
        return new Promise<ICustomDataEntry[]>((resolve:(result:ICustomDataEntry[])=>void, reject:(error:ITrcError)=>void)=>{
            var q = "/data/" + kind;
            this.httpGetAsync(
                q,
                (result: ICustomDataList) => {
                    resolve(result.Entries);
                },
                reject);
        });
    }

} // end class Sheet

// Helper for enumerating /deltas endpoint
// $$$ Use TypeScript generics here?  
export  class DeltaEnumerator implements IHistorySegment
{
    private _sheet : Sheet; // Has auth token 

    // Keep same layout as IHistorySegment
    public NextLink  :string;
    public Results: IDeltaInfo[];

    public constructor(segment : IHistorySegment, sheet : Sheet) {
        this.NextLink = segment.NextLink;
        this.Results = segment.Results;
        this._sheet = sheet;
    }

    // Only call if NextLink != null.
    // If NextLink == null, then we're done with enumeration and caller should invoke the continuation.  
    public GetNext(
        successFunc : (next: DeltaEnumerator) => void
    ) : void {   
        // httpGet just takes the relative path; not the full path  
        
        this._sheet.httpGetDirectAsync(
            this.NextLink, 
            (segment : IHistorySegment) => {
                var e = new DeltaEnumerator(segment, this._sheet);
                successFunc(e);
            },
            () => {} // failure
            );
    }     

    public GetNextAsync(
    ) : Promise<DeltaEnumerator> {     
        
        return new Promise<DeltaEnumerator>((resolve:(result:DeltaEnumerator)=>void, reject:(error:ITrcError)=>void)=> {
            this._sheet.httpGetDirectAsync(
                this.NextLink, 
                (segment : IHistorySegment) => {
                    var e = new DeltaEnumerator(segment, this._sheet);
                    resolve(e);
                }, reject
                );
        });
    }   
}


export class LoginClient {
    // Do a login to convert a canvas code to a sheet reference. 
    public static LoginWithCode(
        loginUrl: string,
        canvasCode: string,
        successFunc: (result: Sheet) => void,
        failureFunc: (error: ITrcError) => void
    ): void {

        var loginBody = {
            Code: canvasCode,
            AppName: "Demo"
        };

        var httpClient = StaticHelper.NewHttpClient(loginUrl);
        httpClient.sendAsync(
            'POST',
            "/login/code2",
            loginBody,
            null, // auth header,
            null, // no geo
            function (sheetRef: ISheetReference) {
                successFunc(new Sheet(sheetRef));
            },
            failureFunc
        );
    }

    public static LoginWithCodeAsync(loginUrl:string, canvasCode:string):Promise<Sheet> {
        return new Promise<Sheet>((resolve:(result:Sheet)=>void, reject:(error:ITrcError)=>void)=>{
            var loginBody = {
                Code: canvasCode,
                AppName: "Demo"
            };

            var httpClient = StaticHelper.NewHttpClient(loginUrl);
            httpClient.sendAsync(
                'POST',
                "/login/code2",
                loginBody,
                null, // auth header,
                null, // no geo
                function (sheetRef: ISheetReference) {
                    resolve(new Sheet(sheetRef));
                }, reject
            );            
        });
    }
}
