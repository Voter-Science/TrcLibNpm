
import * as trc from './trc2';

// Class to deal with Polygon customData. 
// - creating polygons
// - lookup by Friendly Name. This is useful for correlating with sheet names. 
export class PolygonHelper {
    private _sheet: trc.Sheet;

    // Lazily created map for doing a reverse NAme --> dataID lookup. 
    private _name2id: trc.ICustomDataEntry[] = null;

    public constructor(sheet: trc.Sheet)
    {
        this._sheet = sheet;
    }

    // Update an existing polygon 
    public updatePolygon(
        dataId :string,
        friendlyName: string,
        vertices: trc.IGeoPoint[],
        success: (dataId: string) => void
    ): void {
        var body: trc.ICustomDataRequest = PolygonHelper.createDataRequest(
            friendlyName, vertices);

        this._sheet.postCustomData(trc.PolygonKind, dataId, body,
            (result) => {
                success(result.DataId);
            });    
    }

    // Creates a new polygon. 
    // Returns the new dataID
    public createPolygon(
        friendlyName: string,
        vertices: trc.IGeoPoint[],
        success: (dataId: string) => void
    ): void {
        // Pass "_" to mean generate a new data id.  This implies create. 
        this.updatePolygon("_", friendlyName, vertices, success);
    }


    // Convert between schemas.
    public static polygonSchemaFromPoints(vertices: trc.IGeoPoint[]): trc.IPolygonSchema {
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
        vertices: trc.IGeoPoint[]
    ): trc.ICustomDataRequest {
        var result: trc.ICustomDataRequest = {
            FriendlyName: friendlyName,
            Etag: null,
            Value: PolygonHelper.polygonSchemaFromPoints(vertices)
        };
        return result;
    }

    public getPolygonById(
        dataId: string,
        success: (data: trc.IPolygonSchema) => void
    ) {
        this._sheet.getCustomData(
            trc.PolygonKind,
            dataId,
            (result: trc.ICustomDataRequest) => {
                success(result.Value);
            }
        );
    }
    
    public lookupNameFromId(
        name: string,
        success: (dataId: string) => void
    ): void {
        if (this._name2id == null) {
            this._sheet.listCustomData(trc.PolygonKind, result => {
                this._name2id = result;
                var dataId = this.lookupNameFromIdWorker(name);
                success(dataId);
            });
        } else {
            // Not found 
            var dataId = this.lookupNameFromIdWorker(name);
            success(dataId);
        }
    }

    //Assumes  _name2id is already init. 
    private lookupNameFromIdWorker(
        name: string
    ): string {
        for (var i = 0; i < this._name2id.length; i++) {
            var x = this._name2id[i];
            if (x.Name == name) {
                return x.DataId;
            }
        }
        return null;
    }

    public getPolygonByName(
        name: string,
        success: (data: trc.IPolygonSchema) => void
    ) {
        this.lookupNameFromId(name, (dataId) => {
            this.getPolygonById(dataId, d2 => success(d2))
        });
    }
}