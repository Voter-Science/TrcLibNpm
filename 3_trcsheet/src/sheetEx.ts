// Framework classes on top of core TRC wrappers.  
// Whereas the core classes are unopinionated and match the server 1:1,
// these fx classes force a model.   

import * as trcSheet from './sheet';
import { SheetContentsIndex, SheetContents, ISheetContents } from './sheetContents';
import * as common from 'trc-httpshim/common'

// Convenience wrapper for editing sheets. 
// 1. Provides callback notification if other users have changed cells underneath us. 
// 2. local caching mechanism in case we can't write to server. (bad network connection)
// 3. include device GPS location (this is already handled in SheetClient's http connection)
export class SheetEx
{
    private _sheet : trcSheet.SheetClient;
    private _info : trcSheet.ISheetInfoResult; // cache of info. 
    private _data : SheetContentsIndex; // contents

    private _prevVer: number;

    private _gps : common.IGeoPointProvider;

    // Callback to invoke when we find cells that where changed by other users. 
    private _otherUserCallback: (ver: number, contents: ISheetContents) => void;

    public static InitAsync(
        sheet : trcSheet.SheetClient,
        gps : common.IGeoPointProvider
    ) : Promise<SheetEx>
    {        
        return sheet.getInfoAsync().then( info =>
        {
            return sheet.getSheetContentsAsync().then(data => 
            {
                var sheetEx = new SheetEx();
                sheetEx._sheet = sheet;
                sheetEx._info = info;
                sheetEx._data = new SheetContentsIndex(data);
                sheetEx._gps = gps;
                
                sheetEx._otherUserCallback = null;
                sheetEx._prevVer = info.LatestVersion;

                return sheetEx;
            });
        });
    }

    public getInfo() : trcSheet.ISheetInfoResult {
        return this._info;
    }
    public getColumns() : trcSheet.IColumnInfo[] {
        return this._info.Columns;
    }
    public getName() : string {
        return this._info.Name;
    }

    public getContents() : ISheetContents {
        return this._data.getContents();
    }

    // Update a single cell.
    public postUpdateSingleCellAsync(
        recId: string,
        columnName: string,
        newValue: string) : Promise<void>
    {
        var body: ISheetContents = SheetContents.FromSingleCell(recId, columnName, newValue);
        this._data.set(recId, columnName, newValue); // keep local copy updated
        return this.postUpdateAsync(body);
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

    private  postUpdateAsync(
        values: ISheetContents,
    ): Promise<void> {

        // Grab the timestamp + geo of the *client submit*. 
        // This is critical if we're offline. 
        values = SheetContents.AddTimestamp(values, this._gps);

        return this._sheet.postUpdateAsync(values).then(
            (result: trcSheet.IUpdateSheetResult) => {
                var newVer : number = parseInt(result.VersionTag);
                //console.log('new ver=' + newVer);

                var i = this._prevVer + 1;
                this._prevVer = newVer;
                this._info.LatestVersion = newVer; // update cache

                return this.postHelperAsync(i, newVer);                
            });
        // $$$ Subscribe to failure here (what if network is down?). And queue changes. 
    }

    // internal helper to ensure that callbacks are delivered in right order. 
    // First deliver all the _otherUserCallback() for any changes from other users,
    // and then deliver our own successFunc() callback.  
    private postHelperAsync(
        i: number, // current ver
        newVer: number, // top limit        
    ): Promise<void> {
        if ((this._otherUserCallback == null) || (i == newVer)) {
            return Promise.resolve();
        }

        return this._sheet.getDeltaAsync(i).then( (content: ISheetContents) => {
            // Success
            this._otherUserCallback(i, content); // synchronous

            // Move to next iteration
            return this.postHelperAsync(i + 1, newVer);
        }).catch(
            () => {
                // Failure. Maybe ver number is missing?
                // Move to next iteration
                return this.postHelperAsync(i + 1, newVer);
            });
    }  

    public setOtherCallback(
        callback: (ver: number, contents: ISheetContents) => void
    ): void {
        this._otherUserCallback = callback;
    }

}

