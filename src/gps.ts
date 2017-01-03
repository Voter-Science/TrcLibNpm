// Module to track GPS location 

// Same definition in TRC
export interface IGeoPoint {
    Lat: number;
    Long: number;
}


export interface IGpsTracker {
    // Get last known location. Or null if not available. 
    // Objects can refer to this to get a "current" location
    getLocation(): IGeoPoint;
}

// For testing. 
// 
export class MockGpsTracker implements IGpsTracker {
    private _geo : IGeoPoint;

	public getLocation(): IGeoPoint
    {
        return this._geo;
    }
    public setLocation(geo : IGeoPoint) : void {
        this._geo = geo;
    }
}

// Requires 'navigator' object, only works in Browser. 
export class GpsTracker implements IGpsTracker {
    private _watchId: number;
    private _lastGeo: IGeoPoint;
    private _callback: (loc: IGeoPoint) => void;

    // Set the callback that gets fired as location changes. 
    public start(callback: (loc: IGeoPoint) => void) {
        var this2 = this;
        this._callback = callback;

        if (navigator && navigator.geolocation) {
            // JScript closure rules, can't pass an instance delegate. 
            this._watchId = navigator.geolocation.watchPosition(
                (position: Position) => GpsTracker.successCallback(this2, position),
                () => GpsTracker.errorCallback(this2),
                { enableHighAccuracy: true, timeout: 60000, maximumAge: 60000 });

        } else {
            console.log('Geolocation is not supported');
        }
    }

    private static errorCallback(pthis : GpsTracker) { }

    private static successCallback(pthis : GpsTracker, position: Position) {
        pthis._lastGeo = {
            Lat: position.coords.latitude,
            Long: position.coords.longitude
        };
        if (pthis._callback != null) {
            pthis._callback(pthis._lastGeo);
        }
    }

    // get last known location. This is the loc that we passed to  the callback
    // Maybe null if not enabled. 
    public getLocation(): IGeoPoint {
        return this._lastGeo;
    }



    // Disable GPS
    public stop(): void {
        if (navigator && navigator.geolocation) {
            if (this._watchId != null) {
                navigator.geolocation.clearWatch(this._watchId);
                this._watchId = null;
            }
        }
    }
}