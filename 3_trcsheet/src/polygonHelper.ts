
import * as trcSheet from './sheet';
import { SheetContentsIndex, SheetContents, ISheetContents } from './sheetContents';
import * as common from 'trc-httpshim/common'
import * as core from 'trc-core/core'

// Class to deal with Polygon customData. 
// - creating polygons
// - lookup by Friendly Name. This is useful for correlating with sheet names. 
export class PolygonHelper {
    private _sheet: trcSheet.SheetClient;

    // Lazily created map for doing a reverse NAme --> dataID lookup. 
    private _name2id: core.IEnumerable<trcSheet.ICustomDataEntry> = null;

    public constructor(sheet: trcSheet.SheetClient) {
        this._sheet = sheet;
    }

    // Update an existing polygon.
    // Return dataId
    public updatePolygonAsync(
        dataId: string,
        friendlyName: string,
        vertices: common.IGeoPoint[]): Promise<string> {
        var body: trcSheet.ICustomDataRequest = PolygonHelper.createDataRequest(
            friendlyName, vertices);

        return this._sheet.postCustomDataAsync(trcSheet.PolygonKind, dataId, body)
            .then((result) => result.DataId);
    }

    // Creates a new polygon. 
    // Returns the new dataID
    public createPolygon(
        friendlyName: string,
        vertices: common.IGeoPoint[]): Promise<string> {
        // Pass "_" to mean generate a new data id.  This implies create. 
        return this.updatePolygonAsync("_", friendlyName, vertices);
    }


    // Convert between schemas.
    public static polygonSchemaFromPoints(
        vertices: common.IGeoPoint[]
    ): trcSheet.IPolygonSchema {
        var lat: number[] = [];
        var long: number[] = []
        for (var i = 0; i < vertices.length; i++) {
            var v = vertices[i];
            lat.push(v.Lat);
            long.push(v.Long);
        }
        return {
            Lat: lat,
            Long: long
        };
    }

    private static createDataRequest(
        friendlyName: string,
        vertices: common.IGeoPoint[]
    ): trcSheet.ICustomDataRequest {
        var result: trcSheet.ICustomDataRequest = {
            FriendlyName: friendlyName,
            Etag: null,
            Value: PolygonHelper.polygonSchemaFromPoints(vertices)
        };
        return result;
    }

    public getPolygonByIdAsync(
        dataId: string): Promise<trcSheet.IPolygonSchema> {
        return this._sheet.getCustomDataAsync(
            trcSheet.PolygonKind,
            dataId).

            then(
            (result: trcSheet.ICustomDataRequest) =>
                (<trcSheet.IPolygonSchema>result.Value)
            );
    }

    public lookupNameFromIdAsync(
        name: string): Promise<string> {
        if (this._name2id == null) {
            return this._sheet.listCustomDataAsync(trcSheet.PolygonKind).then(result => {
                this._name2id = result;
                return this.lookupNameFromIdWorkerAsync(name);
            });
        } else {
            // Not found 
            return this.lookupNameFromIdWorkerAsync(name);
        }
    }

    //Assumes  _name2id is already init. 
    private lookupNameFromIdWorkerAsync(
        name: string
    ): Promise<string> {
        var result : string= null;
        
        return this._name2id.ForEach( item => {
            if (item.Name == name) {
                result = item.DataId;
            }
        }).then( ()=> result);     
    }

    public getPolygonByNameAsync(
        name: string): Promise<trcSheet.IPolygonSchema> {
        return this.lookupNameFromIdAsync(name).then((dataId) => {
            return this.getPolygonByIdAsync(dataId);
        });
    }
}