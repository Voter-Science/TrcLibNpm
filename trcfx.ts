// Framework classes on top of core TRC wrappers.  
// Whereas the core classes are unopinionated and match the server 1:1,
// these fx classes force a model.   

import * as trc from './trc2';
import * as gps from './gps';


// Convenience wrapper for editing sheets. 
// 1. Provides callback notification if other users have changed cells underneath us. 
// 2. local caching mechanism in case we can't write to server. (bad network connection)
// 3. include device GPS location  
export class SheetEx
{
    private _sheet : trc.Sheet;
    private _info : trc.ISheetInfoResult; // cache of info. 
    private _data : trc.SheetContentsIndex; // contents
    private _gps : gps.IGpsTracker; // optional, 

    private _prevVer: number;

    // Callback to invoke when we find cells that where changed by other users. 
    private _otherUserCallback: (ver: number, contents: trc.ISheetContents) => void;

    public static InitAsync(
        sheet : trc.Sheet,
        gps : gps.IGpsTracker, // Optional 
        callback : (result : SheetEx ) => void) : void
    {
        sheet.getInfo( (info) =>
        {
            sheet.getSheetContents( (data) => 
            {
                var sheetEx = new SheetEx();
                sheetEx._sheet = sheet;
                sheetEx._info = info;
                sheetEx._data = new trc.SheetContentsIndex(data);
                sheetEx._gps = gps;

                sheetEx._otherUserCallback = null;
                sheetEx._prevVer = info.LatestVersion;

                callback(sheetEx);
            });
        });
    }

    public getInfo() : trc.ISheetInfoResult {
        return this._info;
    }
    public getColumns() : trc.IColumnInfo[] {
        return this._info.Columns;
    }
    public getName() : string {
        return this._info.Name;
    }

    public getContents() : trc.ISheetContents {
        return this._data.getContents();
    }

    private getGeo() : gps.IGeoPoint {
        if (this._gps == null) {
            return null;
        }
        return this._gps.getLocation();
    }

    
    // Update a single cell.
    public postUpdateSingleCell(
        recId: string,
        columnName: string,
        newValue: string,
        successFunc: () => void
    ): void {
        var body: trc.ISheetContents = trc.SheetContents.FromSingleCell(recId, columnName, newValue);
        this._data.set(recId, columnName, newValue); // keep local copy updated
        this.postUpdate(body, successFunc);
    }

/*
    // Update multiple columns in a single row 
    private postUpdateSingleRow(
        recId: string,
        columnNames: string[],
        newValues: string[],
        successFunc: () => void
    ): void {
        var body: trc.ISheetContents = trc.SheetContents.FromRow(recId, columnNames, newValues);
        this.postUpdate(body, successFunc);
    }
    */

    private  postUpdate(
        values: trc.ISheetContents,
        successFunc: () => void
    ): void {
        this._sheet.postUpdate(values,
            (result: trc.IUpdateSheetResult) => {
                var newVer : number = parseInt(result.VersionTag);
                //console.log('new ver=' + newVer);

                var i = this._prevVer + 1;
                this._prevVer = newVer;
                this._info.LatestVersion = newVer; // update cache

                if (this._otherUserCallback == null)
                {
                    successFunc();
                } else 
                {
                    this.postHelper(i, newVer, successFunc);
                }
            }, 
            this.getGeo());
        // $$$ Subscribe to failure here (what if network is down?). And queue changes. 
    }

    // internal helper to ensure that callbacks are delivered in right order. 
    // First deliver all the _otherUserCallback() for any changes from other users,
    // and then deliver our own successFunc() callback.  
    private postHelper(
        i: number, // current ver
        newVer: number, // top limit
        successFunc: () => void // called when done 
    ): void {
        if (i == newVer) {
            successFunc();
            return;
        }

        this._sheet.getDelta(i, (content: trc.ISheetContents) => {
            // Success
            this._otherUserCallback(i, content); // synchronous

            // Move to next iteration
            this.postHelper(i + 1, newVer, successFunc);
        },
            () => {
                // Failure. Maybe ver number is missing?
                // Move to next iteration
                this.postHelper(i + 1, newVer, successFunc);
            });

    }  

    public setOtherCallback(callback: (ver: number, contents: trc.ISheetContents) => void): void {
        this._otherUserCallback = callback;
    }

}

