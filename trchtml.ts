// HTML Helpers. Builds on JQuery
// Builds on FX.  

declare var $: any; // external definition for JQuery

import * as trc from './trc2';
import * as trcfx from './trcfx';

// Set an element to a loading glyph. 
// Useful before 
// https://trcanvasdata.blob.core.windows.net/code2/loading.gif
export function Loading(elementId :string) 
{    
    var element = $("#" + elementId);
    element.empty();    

    var loadingImg = "https://trcanvasdata.blob.core.windows.net/code2/loading.gif";
    var tx3 = $("<img src='" + loadingImg +"' heigh=100 width=100/>");
    element.append(tx3);
}

// Add a "download to CSV" button to the parent element. 
export class DownloadHelper {
    public static appendDownloadCsvButton = (parent:Element, getData:()=>trc.ISheetContents) => {
        let button = document.createElement("input");
        button.type = "image";
        button.src = "https://trcanvasdata.blob.core.windows.net/publicimages/export-csv.png";
        button.addEventListener("click", (e)=> {
            let data : trc.ISheetContents = getData();

            var content : string = trc.SheetContents.toCsv(data);

            if (window.navigator.msSaveBlob) {
                console.debug("using msSaveBlob");
                window.navigator.msSaveBlob(new Blob([content], {type:"text/csv;charset=utf-8;"}), "data.csv");
            } else {            
                console.debug("using download attr");
                let uri = encodeURI("data:text/csv;charset=utf-8," + content);
                var link = document.createElement("a");
                link.setAttribute("href", uri);
                link.setAttribute("download", "data.csv");
                parent.appendChild(link);
                link.click();
            }
      });
      parent.appendChild(button);
    }
}

// Render a ISheetContents to HTML. 
// Includes various configuration options.  
export class RenderSheet {

    // Required - set in ctor.
    // Raw data sheet that's being rendered.
    private _data: trc.ISheetContents;

    // count of rows in _data 
    private _numRows: number;

    // which HTML element ( a div tag) that we render to. 
    private _elementId: string;

    public constructor(elementId : string, data: trc.ISheetContents) {
        this._elementId = elementId;
        this._data = data;

        var columnNames: string[] = [];
        for (var columnName in this._data) {
            columnNames.push(columnName);
        }
        this._onlyColumns = columnNames;

        var cFirstColumn = this._data[columnNames[0]];
        this._numRows = cFirstColumn.length;

        this._tableHtml = "<table border=1>";
    }

    public getCountRows(): number {
        return this._numRows;
    }

    // Optional. Column infos.
    // - Can provide Display name. 
    // - for editable controls, can render a specific control based on column type 
    private _columnInfo: trc.IColumnInfo[];

    public setColumnInfo(columnInfo: trc.IColumnInfo[]): void {
        this._columnInfo = columnInfo;
    }

    // Column headers toinclude
    private _onlyColumns: string[];

    // Set which columns to display, and ordering.  
    // If this includes columns not in the original data set, then use setHtml to add a renderer.
    public setColumns(columnNames: string[]): void {
        this._onlyColumns = columnNames;
    }

    // Optional HTML render function for each column
    // If missing, use the default. 
    private _columnRenderer: any = {};

    public setHtml(columnName: string, fpRenderer: (iRow: number) => string) {
        this._columnRenderer[columnName] = fpRenderer;
    }

    // Default table tag. Override this to apply styling, etc.
    // Set to a <table> element.   
    private _tableHtml: string;

    public setTableHtmlTag(tableHtml: string): void {
        this._tableHtml = tableHtml;
    }

    private getRenderer(columnName: string): (iRow: number) => string {
        var fp = this._columnRenderer[columnName];
        if (fp == undefined) {
            return null;
        }
        return fp;
    }

    protected getRenderer2(
        columnName : string,
        columnInfo: trc.IColumnInfo, // may be null
        value: string, // current value, possibly null
        recId: string,
        iRow : number // 0-based row index into sheet 
    ) {
        var fp = this.getRenderer(columnName);
        if (fp == null) {
            // No renderer. Get value from contents and set as text.
            var tcell = $('<td>').text(value);
            return tcell;
        }
        else {
            // Invoke customer renderer to get HTML.
            var html = fp(iRow);
            var tcell = $('<td>').html(html);
            return tcell;
        }
    }

    // null if not found
    private getColumnInfo(columnName: string): trc.IColumnInfo {
        if (this._columnInfo == null) {
            return null;
        }
        for (var i = 0; i < this._columnInfo.length; i++) {
            var ci = this._columnInfo[i];
            if (ci.Name == columnName) {
                return ci;
            }
        }
        return null;
    }

    // Main worker function. 
    // Call this after the various set*() methods are called to configure this.
    public render(        
    ) {
        var rootElement = $('#' + this._elementId);
        rootElement.empty();

        var table = $(this._tableHtml);
        rootElement.append(table);

        // parallel array that matches columnHeaders 
        var columnInfos : trc.IColumnInfo[] = [];

        // Write header
        {
            var t = $('<thead>').append($('<tr>'));
            for (var iColumn = 0; iColumn < this._onlyColumns.length; iColumn++) {
                var columnName = this._onlyColumns[iColumn];
                var displayName = columnName;

                var columnInfo : trc.IColumnInfo = null;
                // If we have a columnInfo, then check getting display name from that.
                if (this._columnInfo != null) {
                    columnInfo = this.getColumnInfo(columnName);
                    if (columnInfo != null) {
                        if (columnInfo.DisplayName != null) {
                            displayName = columnInfo.DisplayName;
                        }
                    }
                }
                columnInfos.push(columnInfo);

                var tCell1 = $('<th>').text(displayName);
                t = t.append(tCell1);
            }
            table.append(t);
        }

        var cRecId = this._data["RecId"];

        // Write each rows
        for (var iRow = 0; iRow < this._numRows; iRow++) {

            var t = $('<tr>');

            var recId : string = (cRecId != undefined) ? cRecId[iRow] : null; 

            for (var iColumn = 0; iColumn < this._onlyColumns.length; iColumn++) {
                var columnName = this._onlyColumns[iColumn];
                var columnInfo = columnInfos[iColumn]; // may be null

                var value : string= null;
                var columnData = this._data[columnName];
                if (columnData != undefined) {
                    value = columnData[iRow];
                }

                var tcell = this.getRenderer2(columnName, columnInfo, value, recId, iRow);
             
                t = t.append(tcell);
            }
            table.append(t);
        } // end each row    
    } // end func
}

// Renders an ISheetContents with editable controls.
// Expected usage:
//   c = new SheetControl(data);
//   // set any render options
//   c.Render('divId')
//
// This can take a 20 seconds for 100s of rows. 
// Expects that css classes exist: PreUpload, OkUpload, OtherUpload. 
export class SheetControl extends RenderSheet {
    private _sheetRef :  trcfx.SheetEx;

    public constructor(
        elementId : string,
        sheetRef :  trcfx.SheetEx  // needed for update
    ) 
    {        
        super(elementId, sheetRef.getContents());
        this._sheetRef = sheetRef;

        this.setColumnInfo(sheetRef.getColumns());

        sheetRef.setOtherCallback(
            (ver, deltas) => SheetControl.onOtherDeltas(this, ver, deltas));
    }
    
    // Helper for setting the cell background color. 
    private setColorClass(element: any, cssColorClass: string) {
        element.removeClass('PreUpload').removeClass('OkUpload').removeClass('OtherUpload').addClass(cssColorClass);
    }
    // 

    // Get the HTML ID for the element representing this cell. 
    // This can be used to colorize the cell on updates. 
    private getCellId(recId: string, columnName: string): string {
        return "row_" + recId + "_" + columnName;
    }

    // get JQuery element for this cell. Used for colorizing.  
    private getElement(recId: string, columnName: string) : any {
        var cellId = this.getCellId(recId, columnName);
        var element = $('#' + cellId);
        return element;
    }

    // Callback from HTML page when a cell has changed. 
    public onCellChange(recId: string, columnName: string, newValue: string) {
        var element = this.getElement(recId, columnName);
        this.setColorClass(element, 'PreUpload');

        // SheetEx will check for deltas, and update the local copy of ISheetContent  
        this._sheetRef.postUpdateSingleCell(recId, columnName, newValue, 
         () => {
             this.setColorClass(element, 'OkUpload');
         }
        );        
    }

    // Callback if other users have changed cells on us. 
    private static onOtherDeltas(
        pthis : SheetControl, 
        ver : number, 
        delta : trc.ISheetContents) : void
    {
        trc.SheetContents.ForEach(delta, 
            (recId, columnName, newValue) => {
                var element = pthis.getElement(recId, columnName);
                pthis.setColorClass(element, 'OtherUpload');
                element.val(newValue);
            }
        );
    }

    // Returns a <td>
    //  Wires up click handlers to point back to this control. 
    protected getRenderer2(
        columnName : string,
        columnInfo: trc.IColumnInfo, // may be null
        value: string, // current value, possibly null
        recId: string,
        iRow : number // 0-based row index into sheet 
    ) {
        var this2 = this; // capture for control handlers
        // see http://stackoverflow.com/questions/6348494/addeventlistener-vs-onclick/6348597#6348597 

        if (columnInfo == null || columnInfo.IsReadOnly) {
            // Readonly values - just display static text.
            return $('<td>').text(value);
        }
        // Editable values - display an edit control. 
        var cellId = this.getCellId(recId, columnName);
        if (columnInfo.PossibleValues != null) {
            // We have a hint about possible values. Use a Combo box 
            // Highlight the currently selected option 
            var selectHtml = '<select id="' + cellId + '" value="' + value + '\">';
            var noneSelected = true;
            for (var idxOption = 0; idxOption < columnInfo.PossibleValues.length; idxOption++) {
                var option = columnInfo.PossibleValues[idxOption];
                if (option == value) {
                    var selected = "selected";
                    noneSelected = false;
                }
                else {
                    var selected = "";
                }
                selectHtml += '<option value=\'' + option + '\' ' + selected + '>' + option + '</option>';
            }
            if (noneSelected) {
                // If nothing from the possible values is selected, then add the current value to the list so that it displays. 
                selectHtml += '<option selected>' + value + '</option>';
            }

            var tSelect = $(selectHtml);
            tSelect.change(
                function() {
                    var val : string = tSelect.val();
                    this2.onCellChange(recId, columnName, val);                
                });

            var tCell = $('<td>').append(tSelect);
            tCell.onc
        }
        else {
            // No hint. Use an open text box
            var tInput = $('<input type="text" id="' + cellId + '"/>');
            tInput.val(value);
            tInput.change( () => {
                this2.onCellChange(recId, columnName, tInput.val());
            });
            var tCell = $('<td>').append(tInput);
        }
        return tCell;
    }
} // end class