
// Shim Http client. In node, this pulls in 'http' and 200k of modules.
// In browser, we get a tiny client on $jquery and save 200k.
import * as http from './httpshim';
import * as common from './common';

class HttpClientFactory
{
    private static startsWith(str: string, word: string): boolean {
        return str.lastIndexOf(word, 0) === 0;
    }

    public static NewHttpClient(
        url: string
        ): http.HttpClient {
        if (HttpClientFactory.startsWith(url, "https://")) {
            var host = url.substr(8);
            return new http.HttpClient("https", host);
        }
        if (HttpClientFactory.startsWith(url, "http://")) {
            var host = url.substr(7);
            return new http.HttpClient("http", host);
        }
        throw "Invalid url protocol: " + url;
    }
}

// Helper for building URis
export class UrlBuilder
{
    private _url : string;

    // Path can either be full (https://) or relative (/sheet)
    public constructor (path : string) {
        this._url = path;
    }

    // This will add a query component to a URL.
    // It handles separate (? vs &) and encoding
    public addQuery(key : string, value : string | number) : void
    {
        if (value == null || value == undefined) {
            return;
        }

        var q = this._url;

        var del : string;
        if (q.indexOf("?") == -1)
        {
            del = "?";
        } else
        {
            del = "&";
        }
        this._url = q + del + key + "=" + encodeURIComponent(value.toString());
    }

    public toString = () : string => this._url;
}

// A generic HTTP client with Promisfy wrappers and auth headers.
export class XClient {
    private _authToken : string;
    private _httpClient: http.HttpClient; // removes HTTPS prefix
    private _gpsProvider : common.IGeoPointProvider;

    public static New(
        endpoint : string,
        authToken : string,
        gpsProvider : common.IGeoPointProvider) : XClient
    {
        var httpClient  = HttpClientFactory.NewHttpClient(endpoint);

        var x = new XClient();
        x._authToken = authToken;
        x._httpClient = httpClient;

        if (gpsProvider == undefined) { gpsProvider = null; }
        x._gpsProvider = gpsProvider;
        return x;
    }

    public getAsync<T>(
        relativePath : string | UrlBuilder
    ) : Promise<T>
    {
        return this.sendAsync<T>("GET", relativePath);
    }

    public deleteAsync<T>(
        relativePath : string| UrlBuilder
    ) : Promise<T>
    {
        return this.sendAsync<T>("DELETE", relativePath);
    }

    public putAsync<T>(
        relativePath : string | UrlBuilder,
        body : any) : Promise<T>
    {
        return this.sendAsync<T>("PUT", relativePath, body);
    }

    public postAsync<T>(
        relativePath : string | UrlBuilder,
        body : any,
        contentType ?: string) : Promise<T>
    {
        return this.sendAsync<T>("POST", relativePath, body, contentType);
    }

    public patchAsync<T>(
        relativePath : string | UrlBuilder,
        body : any,
        contentType ?: string) : Promise<T>
    {
        return this.sendAsync<T>("POST", relativePath, body, contentType);
    }

    public sendAsync<T>(
        method : string,
        relativePath : string | UrlBuilder, // starts with '/'
        body : any = null,
        contentType ?: string
    ) : Promise<T>
    {
        var url : string = relativePath.toString();

        return new Promise<T>(
            (
                resolve: (result: T) => void,
                reject: (error: common.ITrcError) => void
            ) => {
                var geo : common.IGeoPoint = null;
                if (this._gpsProvider != null) {
                    geo = this._gpsProvider.getLoc();
                }

                this._httpClient.sendAsync(
                    method,
                    url,
                    body, // body, not allowed on GET
                    "Bearer " + this._authToken,
                    geo,
                    resolve,
                    reject,
                    contentType
                );
            });
    }

}
