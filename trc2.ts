// TypeScript
// General purpose TypeScript definitions for using TRC
// This is the most fundamental module, and then other modules can build on this.

// Browser & Node mode. Browser would like to use $ from Jquery, as it's already loaded.
declare var require: any;
 
// Shim Http client. In node, this pulls in 'http' and 200k of modules. In browser, we get a tiny client on $jquery and save 200k.   
import * as http from './httpshim';

interface IGeoPoint 
{
    Lat : number;
    Long : number;
}

//---------------------------------------------------------
// Used for TrcWeb plugin model.  

export interface IPluginOptions
{
    // If set, starting recId to display
    recId : string; 
    
    // UrlBase for jumping to another plugin.    
    gotoUrl: string; 
}

export class PluginOptionsHelper
{
    private _opts: IPluginOptions;
    private _currentSheetId : string;

    // Static helper so we can normalize missing option values.
    // Take the current sheet so we can get its SheetId and use that 
    // to construct callback Urls.  
    public static New(opts : IPluginOptions, currentSheet: Sheet) {
        if (opts == null || opts == undefined)
        {
            opts =  {
                recId : null,
                gotoUrl : ""                 
            }            
        }
        var oh = new PluginOptionsHelper();
        oh._opts = opts;
        oh._currentSheetId = currentSheet.getId();
        return oh;
    }

    public getStartupRecId() : string {
        var r = this._opts.recId;
        if (r == undefined) {
            return null;
        }
        return r;
    }

    // Jump to any plugin that supports single.  
    public getGotoLinkRecId(recId :string) : string {
        return this.getGotoLinkTags(recId, "_single");
    }

    // Jump to a specific plugin
    // {endpoint}/{sheetId}/{pluginId}?recId=xxx
    public getGotoLinkPlugin(recId :string, pluginName : string) : string {
        return this._opts.gotoUrl + "/" + this._currentSheetId + "/" + pluginName + "/index.html?recId=" + recId;
    }

    // Jump to a plugin with the following tags
    // tags is a comma separated list of tags.
    // Special case pluginName as '_' 
    // {endpoint}/{sheetId}/_?recId=xxx&tags=a,b,c
    public getGotoLinkTags(recId :string, tags : string) : string {
        return this._opts.gotoUrl + "/" + this._currentSheetId + "/_/index.html?recId=" + recId + "&tags=" +  tags;
    }
}


//--------------------------------------------------------- 
// direct REST definitions 
//

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
    VersionTag : string; // should be an integer
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


export interface IDeltaInfo
{
    Version : number;
    User : string;

    // Optional Lat&Long from where the delta was made
    GeoLat : string;
    GeoLong : string; 
    Timestamp : string; // datetime
    UserIp : string;
    App : string;    

    Value: ISheetContents; // delta applied to the sheet
}
interface IHistorySegment {
    NextLink: string;
    Results: IDeltaInfo[];
}

// TRC errors are returned in a standard format like so:
interface ITRCErrorMessage {
    Code: number;
    Message: string;
}

// AJAX errors are wrapped. 
interface IJQueryAjaxError {
    // This is the raw text of the response. For TRC, that means it's double encoded JSON. 
    responseText: string;
}

//---------------------------------------------------------
// Helpers 
// 

// Helper for maintaining a RecId --> Index mapping over a sheet. 
export class SheetContentsIndex
{    
    private _map : any = { };
    private _source : ISheetContents; 

    public constructor(source : ISheetContents) {
        this._source = source;
        var cRecId = source["RecId"];
        for(var i = 0; i < cRecId.length; i++) {
            var recId = cRecId[i];
            this._map[recId] = i;
        }
    }

    // Get the index into the source. 
    public lookupRecId(recId : string) : number {
        var idx = this._map[recId];
        if (idx == undefined) {
            return -1;
        }
        return idx;
    }

    public set(recId : string, columnName : string, newValue : string) : void {
        var idx = this.lookupRecId(recId);
        if (idx != -1) {
            this._source[columnName][idx] = newValue;
        }
    }

    public getContents() : ISheetContents {
        return this._source;
    }
}

// Helpers for manipulating ISheetContent
export class SheetContents
{
    // Get a reverse lookup map
    // Place here for discoverability 
    public static getSheetContentsIndex(source :ISheetContents) : SheetContentsIndex
    {
        return new SheetContentsIndex(source);
    }

    // Helper to enumerate through each cell in a sheet and invoke a callback
    public static ForEach(
        source : ISheetContents,
        callback : (recId : string, columnName : string, newValue : string ) => void ) : void
    {
        var colRecId = source["RecId"];
        for(var columnName  in source)
        {            
            var column = source[columnName];
            if (column == colRecId) {
                continue;
            }
            for(var i = 0; i < column.length; i++)
            {
                var recId = colRecId[i];
                var newValue = column[i];

                callback(recId, columnName, newValue);
            }
        }
    } 

    public static FromSingleCell(
        recId: string,
        columnName: string,
        newValue: string) : ISheetContents
    {
        var body: ISheetContents = {};
        body["RecId"] = [recId];
        body[columnName] = [newValue];
        return body;
    }   

    public static FromRow(
        recId : string,
        columnNames: string[],
        newValues: string[]) : ISheetContents
    {
        if (columnNames.length != newValues.length)
        {
            throw "length mismatch";
        }
        var body: ISheetContents = {};
        body["RecId"] = [recId];
        for(var i = 0; i < columnNames.length; i ++)
        {
            var columnName = columnNames[i];
            var newValue = newValues[i];
            body[columnName] = [newValue];
        }
        return body;
    }
          
    // applies fpInclude on each row in source sheet. 
    // Returns a new sheet with same columns, but is a subset.
    public static KeepRows(
        source : ISheetContents,
        fpInclude: (idx: number) => boolean
    ) : ISheetContents
    {
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
    // Attempt to get the TRC error message from the response.
    public static _getErrorMsg(error: IJQueryAjaxError): string {
        try {
            var p2: ITRCErrorMessage = JSON.parse(error.responseText);
            return "(" + p2.Code + ") " + p2.Message;
        }
        catch (err) {
            return error.responseText;
        }
    }

    private static startsWith(str : string, word : string) : boolean {
        return str.lastIndexOf(word, 0) === 0;
    }

    public static NewHttpClient(url : string) : http.HttpClient 
    {
        if (StaticHelper.startsWith(url, "https://"))
        {
            var host =url.substr(8); 
            return new http.HttpClient("https", host);
        }
        if (StaticHelper.startsWith(url, "http://"))
        {
            var host =url.substr(7); 
            return new http.HttpClient("http", host);
        }
        throw "Invalid url protocol: " + url;        
    }
}

//---------------------------------------------------------
// Wrapper classes for client objects
//

// TRC Sheet
// - Info - this includes Column information and children.  
// - Contents - the actual data. This could be huge.
export class Sheet {
    private _sheetRef: ISheetReference;
    private _httpClient: http.HttpClient ; // removes HTTPS prefix

    constructor(sheetRef: ISheetReference) {
        this._sheetRef = sheetRef;
        this._httpClient = StaticHelper.NewHttpClient(sheetRef.Server);
    }

    // Wrapper
    private httpPostAsync(
        path: string,  // like: /info
        body: any,
        onSuccess: (result: any) => void, // callback invoked on success. Passed the body, parsed from JSON
        onFailure: (statusCode: number) => void, // callback inoked on failure
        geo : IGeoPoint
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


    // Wrapper
    private httpGetAsync(
        path: string,  // like: /info     
        onSuccess: (result: any) => void, // callback invoked on success. Passed the body, parsed from JSON
        onFailure: (statusCode: number) => void // callback inoked on failure
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

    // get the unqiue sheet Id. This will be a guid (not the friendly name).   
    public getId() : string {
        return this._sheetRef.SheetId;
    }

    public getInfo(callback: (result: ISheetInfoResult) => void) {
        this.httpGetAsync("/info",
            function (info: ISheetInfoResult) {
                callback(info);
            },
            () => { } // callback inoked on failure 
        );
    }

    // Get sheet contents as a Json object. 
    public getSheetContents(
        successFunc: (data: ISheetContents) => void
    ): void {
        this.httpGetAsync("",
            successFunc,
            () => { });
    }

    // Update a single cell.
    public postUpdateSingleCell(
        recId: string,
        columnName: string,
        newValue: string,
        successFunc: (result:IUpdateSheetResult) => void,
        geo : IGeoPoint
    ): void {
        var body: ISheetContents = SheetContents.FromSingleCell(recId, columnName, newValue);
        this.postUpdate(body, successFunc, geo);
    }

    // Update multiple columns in a single row 
    public postUpdateSingleRow(
        recId: string,
        columnNames: string[],
        newValues: string[],
        successFunc: (result:IUpdateSheetResult) => void,
        geo : IGeoPoint
    ): void {
        var body: ISheetContents = SheetContents.FromRow(recId, columnNames, newValues);
        this.postUpdate(body, successFunc, geo);
    }

    // Update multiple rows. 
    // Expected that SheetContents['RecId'] is set. 
    public postUpdate(
        values: ISheetContents,
        successFunc: (result:IUpdateSheetResult) => void,
        geo : IGeoPoint
    ) {
        this.httpPostAsync("",
            values,
            successFunc,
            () => { },
            geo);
    }

    // Get single version change
    public getDelta(
        version : number, 
        successFunc : (result :ISheetContents) => void,
        failureFunc : () => void
        ) : void 
    {
         this.httpGetAsync(
            "/history/"  + version, 
            successFunc,
            failureFunc);
    }
    // $$$ Get range of deltas?

} // end class Sheet

export class LoginClient {
    // Do a login to convert a canvas code to a sheet reference. 
    public static LoginWithCode(
        loginUrl: string,
        canvasCode: string,
        successFunc: (result: Sheet) => void,
        failureFunc: (statusCode: number) => void
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
}
