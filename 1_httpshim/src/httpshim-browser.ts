// Http shim used in the browser.
// Assumes we have JQuery. This saves about 200k.

import * as common from './common'

declare var $: any; // Jquery

export class HttpClient {
    private _protocol: string; // HTTP or HTTPS
    private _hostname: string;  // 'trc-login.voter-science.com'. Does not inlcude protocol

    public constructor(protocol : string, hostName : string) {
        this._protocol = protocol;
        this._hostname = hostName;
    }

    // Helper for sending a JSON request to a server.
    // All calls will dispatch either onSuccess() or onFailure()
    public sendAsync(
        verb: string, // GET, POST, etc
        path: string,  // like: /login/code2
        body: any, // null on empty. If present, this will get serialized to JSON
        authHeader: string, // null if missing
        geo: common.IGeoPoint, // optional client location
        onSuccess: (result: any) => void, // callback invoked on success. Passed the body, parsed from JSON
        onFailure: (statusCode: common.ITrcError) => void, // callback inoked on failure
        contentType?: string
    ): void {
        // This automatically follows 30x. https://dvcs.w3.org/hg/xhr/raw-file/tip/Overview.html#infrastructure-for-the-send%28%29-method
        var url : string;
        if (path.indexOf("http") == 0) {
            url = path;
        } else {
            url = this._protocol + "://" + this._hostname + path;
        }
        // $.support.cors = true; // already set at login?

        contentType = contentType || "application/json";

        if (contentType === "application/json" && body) {
            body = JSON.stringify(body);
        }

        $.ajax({
            url: url,
            type: verb,
            contentType: contentType,
            beforeSend: function (xhr: any) {
                xhr.setRequestHeader('accept', 'application/json');
                if (authHeader != null) {
                    xhr.setRequestHeader("Authorization", authHeader);
                }
                if (geo != null) {
                    xhr.setRequestHeader("x-lat", geo.Lat);
                    xhr.setRequestHeader("x-long", geo.Long);
                }
            },
            data: body,
            processData: false,
            success: (data : any, textStatus : any, xhr : any) => {
                var status= xhr.status;
                if (status == 202) {
                    // Redirect logic
                    var loc = xhr.getResponseHeader('Location');
                    if (!!loc) {
                        setTimeout(() => {
                            this.sendAsync("GET", loc, null, authHeader, geo, onSuccess, onFailure);
                        }, 5 * 1000);
                        return;
                    }
                }
                onSuccess(data);
            },
            error: function (xhr: any, statusText: any, errorThrown: any) {
                var obj = <common.ITrcError> xhr.responseJSON;
                if (!obj || !obj.Message) {
                    // Really bad ... not a structured error
                    var code = xhr.status;
                    var msg = "(" +statusText + ") Error " + code + " from " +verb + " " + url;
                    onFailure(common.makeError(code, msg));
                } else {
                    // formal TRC error
                    onFailure(obj);
                }
            }

        });
    }
}
