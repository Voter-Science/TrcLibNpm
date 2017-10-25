// Http shim used in the browser.
// Assumes we have JQuery. This saves about 200k.  

declare var require: any;

export interface IGeoPoint {
    Lat: number;
    Long: number;
}

// Provider to get the current location. 
export interface IGeoPointProvider {
    getLoc() : IGeoPoint;
}

// An empty geo provider. USeful for testing.
export class MockGpsTracker implements IGeoPointProvider {
    private _geo : IGeoPoint;

    public MockGpsTracker()
    {
        // Set to a default value so that we don't get undefined.
        this._geo = { Lat : 0, Long : 0 };
    }

	public getLoc(): IGeoPoint
    {
        return this._geo;
    }
    public setLocation(geo : IGeoPoint) : void {
        this._geo = geo;
    }
}

export interface ITrcError
{
    Code : number; // http status code. 404, etc
    Message: string; // user message. 
    InternalDetails  :string; // possible diagnostic details.
    CorrelationId : string; // for reporting to service. 
}

export function makeError(code : number, message? : string) : ITrcError
{
    return {
        Code: code,
        Message : (message == undefined) ? null : message,
        InternalDetails : null,
        CorrelationId : null
    };
}