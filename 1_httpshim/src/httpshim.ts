// Shim for sending http requests.
// In the browser, this pulls in 200k. So allow the browser to shim via JQuery

declare var require: any;

import * as common from './common'

//import * as http from 'http'
var http = require('http');
var https = require('https');
var urlLib = require('url');

export class HttpClient {
    private _channel : any;
    private _hostname: string;  // 'trc-login.voter-science.com'. Does not inlcude protocol
    private _port : number;

    public constructor(
        protocol : string,
        hostName : string
    ) {
        if (protocol == "https") {
            this._port = 443;
            this._channel = https;
        } else {
            this._port = 80;
            this._channel = http;
        }

        var parts = hostName.split(':');
        if (parts.length == 2) {
            hostName = parts[0];
            this._port = parseInt(parts[1]);
        }

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
        onFailure: (error: common.ITrcError) => void, // callback invoked on failure
        contentType?: string
    ) {
        //console.log('before send: ' + verb + " " + path);
        var options = {
            hostname: this._hostname,
            port: this._port,
            path: path,
            method: verb
        };

        contentType = contentType || 'application/json'

        var req = this._channel.request(options, (res: any) => {
            //console.log('statusCode: ', res.statusCode);
            //console.log('headers: ', res.headers);

            res.setEncoding('utf8');
            var body = '';
            res.on('data', function (d: any) {
                body += d;
            });

            res.on('end', () => {
                if (res.statusCode == 202) {
                    // Location header
                    // https://stackoverflow.com/questions/39145172/getting-response-headers-with-node-request-module
                    var loc = res.headers["Location"];
                    if (!!loc) {
                        // $$$ Should do this at top in options.
                        // See https://stackoverflow.com/questions/17184791/node-js-url-parse-and-pathname-property
                        var newPath = urlLib.parse(loc).path; // include query string
                        setTimeout(() => {
                            this.sendAsync("GET", newPath, null, authHeader, geo, onSuccess, onFailure);
                        }, 5 * 1000);
                        return;
                    }

                }
                if (res.statusCode >= 400) {
                    // error
                    //console.log("error: " + verb + " " + path);
                    //console.log("error: " + res.statusCode + "Body: " + body);

                    // Graceful TRC errors have an error payload of shape ITrcError
                    // Get the message property.
                    try {
                        var parsed = JSON.parse(body);
                        var x = <common.ITrcError>parsed;

                        if (x.Message != undefined) {
                            var url = verb + " " + path;
                            console.error(">>> TRC HTTP failed with " + res.statusCode + ". " + url);
                            console.error("  " + x.Message);
                        }

                        if (x.Code != undefined) {
                             onFailure(x);
                            return;
                        }

                    } catch(err) {

                    }
                    onFailure(common.makeError(res.statusCode));
                    return;
                }

                if (body.length == 0) {
                    body = "{}";
                }

                try {
                    var parsed = JSON.parse(body);
                } catch (err) {
                    console.error('Unable to parse response as JSON', err);
                    console.error(body);
                    onFailure(common.makeError(505)); // server error?
                    return;
                }
                //console.log('>> success: body=' + body);
                onSuccess(parsed);
                //console.log('<< return from success callback');

                // pass the relevant data back to the callback
                //console.log('Output:=' + body);
            });

        });
        if (geo != null && geo != undefined) {
            req.setHeader('x-lat', geo.Lat);
            req.setHeader('x-long', geo.Long);
        }
        req.setHeader('accept', 'application/json');
        req.setHeader('content-type', contentType);
        if (authHeader != null) {
            req.setHeader('Authorization', authHeader);
        }

        if (body != null) {
            if (contentType === 'application/json') {
                var dataJson: string = JSON.stringify(body);
                req.end(dataJson, 'utf8');
            } else {
                req.setHeader('content-type', contentType);
                req.end(body, 'utf8');
            }
        } else {
            req.end();
        }

        req.on('error', (e: any) => {
            console.log('error:' + e);
            onFailure(common.makeError(506, e)); // couldn't send
        });
    } // end sendAsync
}
