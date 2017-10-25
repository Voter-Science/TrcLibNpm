
import * as XC from 'trc-httpshim/xclient'

// Error results from TRC. 
export interface ITrcError {
    Code: number; // http status code. 404, etc
    Message: string; // user message. 
    InternalDetails: string; // possible diagnostic details.
    CorrelationId: string; // for reporting to service. 
}

export interface IGeoPoint {
    Lat: number;
    Long: number;
}

// Call handler on each item. Automatically follow continuation segments. 
// If any item throws, that aborts the walk and the promise is rejected. 
export interface IEnumerable<T> {
    ForEach(handler: (item: T) => void): Promise<void>;
}

// Provide an IEnumerable<T> around an array. 
// Accepts null. 
export class ArrayEnumerable<T> implements IEnumerable<T>
{
    private _items: T[];

    public constructor(items: T[]) {
        this._items = items;
    }
    ForEach(handler: (item: T) => void): Promise<void> {
        try {
            if (this._items != null) {
                for (var i in this._items) {
                    var item = this._items[i];
                    handler(item);
                }
            }
            return Promise.resolve();
        }
        catch (e) {
            return Promise.reject(e);
        }
    }
}

// Wire format that TRC returns for segmented arrays. 
export interface ISegment<T> {
    NextLink: string; // relative link to get next set of results  
    Results: T[];
}

export interface IUserDetails {
    // TRC's native user identity
    // This is the only gauranteed non-null field
    Id: string;

    // Primary email for the user. 
    // Gauranteed non-null
    Email: string;

    // Possible user name 
    Name: string;

    // Null if none? 
    // Or could point to a default?
    PictureUri: string;
}

// Expose key common operations for the TRC service
export class UserClient {
    private _http: XC.XClient;

    public constructor(http: XC.XClient) {
        this._http = http;
    }

    public getUserInfoAsync(): Promise<IUserDetails> {
        return this._http.getAsync("/me");
    }

    // Get activity feed for current user
    // Returns as RSS (XML). 
    public getActivityFeedAsync(): Promise<any> {
        return this._http.getAsync("/me/feed/rss");
    }
}
