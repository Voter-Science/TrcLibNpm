// Module to track GPS location 

import * as common from 'trc-httpshim/common'

// Same definition as from common
export interface IGeoPoint {
    Lat: number;
    Long: number;
}


// Requires 'navigator' object, only works in Browser. 
export class GpsTracker implements common.IGeoPointProvider {
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
    public getLoc(): IGeoPoint {
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