// Testing mocks 

import * as trc from './trc2';

// Can provide a mock object that mocks out calls to TrcSheet. 
export class Sheet extends trc.Sheet {
    public _sheetInfo: trc.ISheetInfoResult;

    public static DefaultName : string = "TestSheet";

    public constructor()        
    {
        var t :trc.ISheetReference =  
        {
             AuthToken : "xxx",
             SheetId : "123",
             Server : "https://contoso.com"
        };        
        super(t);

        this._sheetInfo = {
            Name: Sheet.DefaultName,
            ParentName : "ParentSheet",
            ParentId : null,
            LatestVersion: 1,
            CountRecords: 10,

            Latitute: 101,
            Longitude: 102,     

            Columns : null                    
        };
    }

    public getInfo(
        successFunc: (data: trc.ISheetInfoResult) => void) {

        successFunc(this._sheetInfo);
    } 
}
