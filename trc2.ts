// TypeScript
// General purpose TypeScript definitions for using TRC

// Browser & Node mode. Browser would like to use $ from Jquery, as it's already loaded.

declare var $: any;

declare var require: any;

// $$$ This adds 196k to the bundle. 
var https = require('https');
//import * as http from 'http';
//import * as _request from 'request';

// var loginUrl = "https://trc-login.voter-science.com";
// canvas.voter-science.com/home/about

// Helper for sending a JSON request to a server.
// All calls will dispatch either onSuccess() or onFailure()
export function sendAsync(
    verb: string, // GET, POST, etc
    hostname: string,  // 'trc-login.voter-science.com'. Does not inlcude protocol 
    path: string,  // like: /login/code2
    body: any, // null on empty. If present, this will get serialized to JSON
    authHeader : string, // null if missing 
    onSuccess: (result: any) => void, // callback invoked on success. Passed the body, parsed from JSON
    onFailure: (statusCode:number) => void // callback inoked on failure
) {
    //console.log('before send');
    var options = {
        hostname: hostname,
        port: 443,
        path: path,
        method: verb
    };

    var req = https.request(options, (res: any) => {
        //console.log('statusCode: ', res.statusCode);
        //console.log('headers: ', res.headers);

        res.setEncoding('utf8');
        var body = '';
        res.on('data', function (d: any) {
            body += d;
        });

        if (res.statusCode >= 400) {
            // error
            console.log("Body: " + body);
            onFailure(res.statusCode);
            return;
        }

        res.on('end', function () {
            try {
                var parsed = JSON.parse(body);
                onSuccess(parsed);
            } catch (err) {
                console.error('Unable to parse response as JSON', err);
                //return cb(err);
                onFailure(505); // server error?
            }

            // pass the relevant data back to the callback
            // console.log('Output:=' + body);
        });

    });
    req.setHeader('content-type', 'application/json');
    if (authHeader != null)
    {
        req.setHeader('Authorization', authHeader);
    }

    if (body != null) {
        var dataJson: string = JSON.stringify(body);
        req.end(dataJson, 'utf8');
    } else {
        req.end();
    }

    req.on('error', (e: any) => {
        console.log('error:' + e);
        onFailure(506); // couldn't send
    });
} // end sendAsync


// The response back from a login. This provides access to a sheet. 
export interface ISheetReference {
    // The auth parameter for accessing this sheet. scheme is 'Bearer'
    AuthToken: string;

    // The URL endpoint to access this sheet at. This may be different than the login server. 
    Server: string;

    // The unique Sheet Identifier for accessing this sheet. 
    SheetId: string;
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
    // Columns: IColumnInfo[];
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

        // https://foo --> foo
    public static getHostname(url : string) : string {
        return url.substr(8);
    }
}

export class Sheet {
    private _sheetRef: ISheetReference;
    private _hostName :string; // removes HTTPS prefix

    constructor(sheetRef: ISheetReference) {
        this._sheetRef = sheetRef;
        this._hostName = StaticHelper.getHostname(sheetRef.Server);
    }

    public getInfo(callback: (result: ISheetInfoResult) => void) {
        var url = this._sheetRef.Server + "/sheets/" + this._sheetRef.SheetId + "/info";
        
        sendAsync(
            'GET',
            this._hostName,
            "/sheets/" + this._sheetRef.SheetId + "/info",
            null, // body
            "Bearer " + this._sheetRef.AuthToken,
            function (info: ISheetInfoResult) {
                callback(info);
            },
            () => { } // callback inoked on failure
        );     
    }
}

export class LoginClient {
    // Do a login to convert a canvas code to a sheet reference. 
    public static LoginWithCode(
        loginUrl: string,
        canvasCode: string,
        successFunc: (result: Sheet) => void,
        failureFunc: (statusCode : number) => void
    ): void {

        var loginBody = {
            Code: canvasCode,
            AppName: "Demo"
        };

        sendAsync(
            'POST',
            StaticHelper.getHostname(loginUrl), // remove HTTPs
            "/login/code2",
            loginBody,
            null, // auth header
            function (sheetRef: ISheetReference) {
                successFunc(new Sheet(sheetRef));
            },
            failureFunc
        );
    }
}
