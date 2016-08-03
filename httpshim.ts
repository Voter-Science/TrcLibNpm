// Shim for sending http requests. 
// In the browser, this pulls in 200k. So allow the browser to shim via JQuery

declare var require: any;

var https = require('https');

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
    ) {
        //console.log('before send');
        var options = {
            hostname: this._hostname,
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
                console.log("error: " + verb + " " + path);
                console.log("error: " + res.statusCode + "Body: " + body);
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
        if (geo != null && geo != undefined) {
            req.setHeader('x-lat', geo.Lat);
            req.setHeader('x-long', geo.Long);
        }
        req.setHeader('content-type', 'application/json');
        req.setHeader('accept', 'application/json');
        if (authHeader != null) {
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
}