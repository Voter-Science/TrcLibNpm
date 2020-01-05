// Helpers for manipulating  with ISheetContents 

import * as common from 'trc-httpshim/common'

// Canonical definition for standard columns names 
// Not all sheets have all these. 
export class ColumnNames
{
    public static readonly RecId : string = "RecId"; // Primary key! 

    public static readonly FirstName : string = "FirstName";
    public static readonly LastName : string = "LastName";

    public static readonly Party : string = "Party"; // 0...5. 

    public static readonly Address : string = "Address";
    public static readonly City : string = "City";
    public static readonly Zip : string = "Zip";

    public static readonly Lat : string = "Lat";
    public static readonly Long : string = "Long";

    public static readonly XVoted : string = "XVoted";
    public static readonly XTargetPri : string = "XTargetPri";


    // Optional 
    public static readonly PrecinctName : string = "PrecinctName";
    public static readonly Cellphone : string = "Cellphone";    

    // Household-ID.
    // If not present, this can be a hash computed from (Address,City,Zip)
    // The exact value doesn't matter, just the uniquness.   
    public static readonly HHID : string = "HHID";
    
    // "System" info from deltas.
    public static readonly XUser : string = "XUser"; // username
    public static readonly XApp : string = "XApp"; // which app was used 
    public static readonly XLat : string = "XLat"; // client's lat,long when entering
    public static readonly XLong : string = "XLong";
    public static readonly XLastModified : string = "XLastModified";
    public static readonly XIPAddress : string = "XIPAddress";
    
}

// The sheet contents. 
// Column-major order. 
// Dictionary ColumnNames(string) --> values (string[int i])
// $$$ Does this need to track order of columnns?
export interface ISheetContents {
    [colName: string]: string[];
}

// Helper for maintaining a RecId --> Index mapping over a sheet. 
export class SheetContentsIndex {
    private _map: any = {};
    private _source: ISheetContents;

    public constructor(source: ISheetContents) {
        this._source = source;
        var cRecId = source["RecId"];
        for (var i = 0; i < cRecId.length; i++) {
            var recId = cRecId[i];
            this._map[recId] = i;
        }
    }

    // Get the index into the source. 
    public lookupRecId(recId: string): number {
        var idx = this._map[recId];
        if (idx == undefined) {
            return -1;
        }
        return idx;
    }

    public set(recId: string, columnName: string, newValue: string): void {
        var idx = this.lookupRecId(recId);
        if (idx != -1) {
            this._source[columnName][idx] = newValue;
        }
    }

    public getContents(): ISheetContents {
        return this._source;
    }
}

// Helpers for manipulating ISheetContent
export class SheetContents {
    // Get a reverse lookup map
    // Place here for discoverability 
    public static getSheetContentsIndex(source: ISheetContents): SheetContentsIndex {
        return new SheetContentsIndex(source);
    }

    // Convert an ISheetContents to a CSV. 
    public static toCsv(data: ISheetContents): string {
        let colKeys: string[] = Object.keys(data);
        let grid: string[][] = [];
        let rowCount = data[colKeys[0]].length;
        let index = 0;

        grid.push(colKeys);

        while (index < rowCount) {
            let row: string[] = [];
            for (let colKey of colKeys) {
                var direct = data[colKey][index];
                var val: string;
                if (direct == null || direct == undefined) {
                    val = "";
                } else {
                    val = direct.toString();
                    try {
                        // Escape commas. 
                        val = val
                            .replace(/\"/g, '\'')
                            .replace(/\t|\n|\r/g, ' ');
                        if (val.indexOf(",") >= 0) {
                            val = "\"" + val + "\"";
                        }
                    }
                    catch (e) {
                        val = "???";
                    }
                }
                row.push(val);
            }
            grid.push(row);
            index++;
        }

        let content = "";

        grid.forEach((arr, index) => {
            let row = arr.join(",");
            content += index < grid.length ? row + "\r\n" : row;
        });
        return content;
    }

    // Helper to enumerate through each cell in a sheet and invoke a callback
    public static ForEach(
        source: ISheetContents,
        callback: (recId: string, columnName: string, newValue: string) => void): void {
        var colRecId = source[ColumnNames.RecId];
        for (var columnName in source) {
            var column = source[columnName];
            if (column == colRecId) {
                continue;
            }
            for (var i = 0; i < column.length; i++) {
                var recId = colRecId[i];
                var newValue = column[i];

                callback(recId, columnName, newValue);
            }
        }
    }

    public static FromSingleCell(
        recId: string,
        columnName: string,
        newValue: string): ISheetContents {
        var body: ISheetContents = {};
        body[ColumnNames.RecId] = [recId];
        body[columnName] = [newValue];
        return body;
    }

    public static FromRow(
        recId: string,
        columnNames: string[],
        newValues: string[]): ISheetContents {
        if (columnNames.length != newValues.length) {
            throw "length mismatch";
        }
        var body: ISheetContents = {};
        body[ColumnNames.RecId] = [recId];
        for (var i = 0; i < columnNames.length; i++) {
            var columnName = columnNames[i];
            var newValue = newValues[i];
            body[columnName] = [newValue];
        }
        return body;
    }

    // applies fpInclude on each row in source sheet. 
    // Returns a new sheet with same columns, but is a subset.
    public static KeepRows(
        source: ISheetContents,
        fpInclude: (idx: number) => boolean
    ): ISheetContents {
        var columnNames: string[] = [];
        var results: ISheetContents = {};

        var len: number = -1;
        for (var columnName in source) {
            if (len == -1) {
                len = source[columnName].length;
            }
            columnNames.push(columnName);
            results[columnName] = [];
        }

        //for(var iRow  in cRecId)
        for (var iRow = 0; iRow < len; iRow++) {
            var keepRow: boolean = fpInclude(iRow);
            if (keepRow) {
                for (var x in columnNames) {
                    var columnName = columnNames[x];
                    var val = source[columnName][iRow];
                    results[columnName].push(val)
                }
            }
        }
        return results;
    }

    // Return a new sheet that has at most topN rows from the given sheet.
    public static TakeN(sheet: ISheetContents, topN: number): ISheetContents {
        var sheet2: ISheetContents = {};
        for (var key in sheet) {
            var value = sheet[key];
            sheet2[key] = value.slice(0, topN);
        }
        return sheet2;
    }

    // Add XLastModified,XLat,XLong
    public static AddTimestamp(
        source: ISheetContents,
        gps: common.IGeoPointProvider = null)
        : ISheetContents {
        var curTime = new Date().toISOString();

        var cs: string[] = [];
        var vs: string[] = [];

        cs.push(ColumnNames.XLastModified);
        vs.push(curTime);

        if (!!gps) {
            var loc = gps.getLoc();

            cs.push(ColumnNames.XLat);
            cs.push(ColumnNames.XLong);

            vs.push(loc.Lat.toString());
            vs.push(loc.Long.toString());
        }

        return SheetContents.Append(source, cs, vs);
    }

    // Append the given column and values to each row in the sheet
    // newColumns.Length == newValues.Length;
    public static Append(
        source: ISheetContents,
        newColumns: string[],
        newValues: string[]
    )
        : ISheetContents {
        var results: ISheetContents = {};

        var numRows: number = -1;
        for (var columnName in source) {
            if (numRows == -1) {
                numRows = source[columnName].length;
            }
            results[columnName] = [];
        }

        for (var i in newColumns) {
            var columnName = newColumns[i];
            results[columnName] = [];
        }

        for (var iRow = 0; iRow < numRows; iRow++) {
            // Existing columns 
            for (var columnName in source) {
                var val = source[columnName][iRow];
                results[columnName].push(val)
            }

            // Add new columns
            for (var i in newColumns) {
                var columnName = newColumns[i];
                var val = newValues[i];
                results[columnName].push(val)
            }
        }
        return results;
    }
}
