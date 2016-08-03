// Http shim used in the browser.
// Assumes we have JQuery. This saves about 200k.  

declare var require: any;

declare var $: any; // Jquery 

interface IGeoPoint {
    Lat: number;
    Long: number;
}

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
        geo: IGeoPoint, // optional client location   
        onSuccess: (result: any) => void, // callback invoked on success. Passed the body, parsed from JSON
        onFailure: (statusCode: number) => void // callback inoked on failure
    ): void {

        var url = this._protocol + "://" + this._hostname + path;
        // $.support.cors = true; // already set at login?
        $.ajax({
            url: url,
            type: verb,
            contentType: "application/json",
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
            data: (body == null) ? undefined : JSON.stringify(body),
            success: onSuccess,
            error: function (xhr: any, statusText: any, errorThrown: any) {
                //  JQuery hides the numberical status code. 
                onFailure(601); // $$$ get correct status code.     
            }

        });
    }
}