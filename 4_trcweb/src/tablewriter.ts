

// declare var $: JQueryStatic;

// If a property passed to TableWriter<T>.writeRow implements IRenderCell,
// then use this rendering. 
export interface IRenderCell {
    // Returns a 
    render(): JQuery<HTMLElement>;
}

// For draing a button  setting in Table rows 
export class ClickableValue<T> implements IRenderCell {
    public _next: () => void; // What happens when we click
    public _value: T;
    public constructor(value: T, next: () => void) {
        this._value = value;
        this._next = next;
    }

    public toString() { return this._value.toString(); };

    public render(): JQuery<HTMLElement> {
        var text = this._value.toString();
        var td1 = $("<button>").text(text).click(() => {
            this._next();
        });
        return td1;
    }
}

// For displaying a color in Table rows 
export class ColorValue implements IRenderCell {
    public _color: string;
    public _next: () => void; // What happens when we click

    public constructor(color: string, next: () => void) {
        this._color = color;
        this._next = next;
    }

    public toString() { return this._color; };

    public render(): JQuery<HTMLElement> {
        return $("<span>").text("View").css("background-color", this._color).click(() => {
            this._next();
        });
    }
}

function escCsv(x: string): string {
    // Replace(string) only replaces the first occurence. Must use with regEx to replace all
    // https://stackoverflow.com/questions/1144783/how-to-replace-all-occurrences-of-a-string-in-javascript
    // Remove problematic chars from the cell
    return x
        .replace(/,|\n|\r|,/g, '.')
        .replace(/\t/g, ' ')
        .replace(/\"/g, '\'');
}

export class TableWriter<T> {
    private _root: JQuery<HTMLElement>;
    private _table: JQuery<HTMLElement>;
    private _count: number;
    private _columns: string[];

    private _csvContent: string = "";
    private _csvIdx: number = 0;

    public constructor(root: JQuery<HTMLElement>, columnsNames?: string[]) {
        this._root = root;
        this._count = 0;
        this._columns = columnsNames;
    }

    // When complete, add the download icon 
    public addDownloadIcon(): void {
        var parent = this._root.get(0);

        let button = document.createElement("input");
        button.type = "image";
        button.src = "https://trcanvasdata.blob.core.windows.net/publicimages/export-csv.png";
        button.addEventListener("click", (e) => {
            var content: string = this._csvContent;

            if (window.navigator.msSaveBlob) {
                console.debug("using msSaveBlob");
                window.navigator.msSaveBlob(new Blob([content], { type: "text/csv;charset=utf-8;" }), "data.csv");
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
        parent.insertBefore(button, parent.firstChild);
    }

    private csvAddNewLine() {
        this._csvContent += "\r\n";
        this._csvIdx = 0;
    }
    private csvAddCell(x: string) {
        if (this._csvIdx != 0) {
            this._csvContent += ",";
        }
        this._csvIdx++;
        this._csvContent += escCsv(x);
    }

    public writeRow(row: T): void {
        if (this._count == 0) {
            // Writer header 

            this._table = $("<table>").attr("border", '1');
            this._root.append(this._table);

            var tr = $("<tr>");

            if (!this._columns) {
                this._columns = Object.getOwnPropertyNames(row);
            }

            this._columns.forEach(val => {
                this.csvAddCell(val);

                var td = $("<td>").text(val);
                tr.append(td);
            });
            this.csvAddNewLine();
            this._table.append(tr);
        }

        var tr = $("<tr>");

        this._columns.forEach(columnName => {
            var td = $("<td>");

            var text = "";
            var val: any = (<any>row)[columnName];
            if (!!val) {
                // Runtime type check: https://stackoverflow.com/a/14426274
                var asRenderCell = <IRenderCell>(val);
                if (!!asRenderCell.render) {
                    // ClickableValue
                    var inner = asRenderCell.render();
                    td = td.append(inner);
                } else {
                    td.text(val);
                }
                text = val.toString();
            }
            tr.append(td);
            this.csvAddCell(text);
        });
        this.csvAddNewLine();
        this._table.append(tr);

        this._count++;
    }
}
