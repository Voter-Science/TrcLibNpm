
import * as trc from './trc2';

//---------------------------------------------------------
// Used for TrcWeb plugin model.  

export interface IPluginOptions {
    // If set, starting recId to display
    recId: string;

    // UrlBase for jumping to another plugin.    
    gotoUrl: string;
}

export interface IGotoLinkOptions {
    //
    // Options once we find a plugin:

    // If set, jump to this recId (if the target plugin supports it)
    recId?: string;

    //
    // Which plugin?
    // Either all (_), filter to tags, or use an explicit plugin. 

    // If set, comma delimited list of tags to filter plugin selection to 
    tags?: string;

    // If set, jump to this specific plugin. 
    plugin?: string;

    //
    // Which sheet?

    // If set, jump to this sheet id. Else jump the 'current' id. 
    sheetId?: string;
}

export class PluginOptionsHelper {
    private _opts: IPluginOptions;
    private _currentSheetId: string;

    // Static helper so we can normalize missing option values.
    // Take the current sheet so we can get its SheetId and use that 
    // to construct callback Urls.  
    public static New(opts: IPluginOptions, currentSheet: trc.Sheet) {
        if (opts == null || opts == undefined) {
            opts = {
                recId: null,
                gotoUrl: ""
            }
        }
        var oh = new PluginOptionsHelper();
        oh._opts = opts;
        oh._currentSheetId = currentSheet.getId();
        return oh;
    }

    public getGotoLink(p: IGotoLinkOptions): string {
        var sheetId = this._currentSheetId;
        if (p.sheetId != undefined) {
            sheetId = p.sheetId;
        }
        var plugin = "_";
        if (p.plugin != undefined) {
            plugin = p.plugin;
        }

        var uri = this._opts.gotoUrl + "/" + sheetId + "/" + plugin + "/index.html";


        if (p.recId != undefined) {
            uri = trc.StaticHelper.addQuery(uri, "recId", p.recId);
            p.tags = "_single";
        }

        if (plugin == "_") {
            if (p.tags != undefined) {
                uri = trc.StaticHelper.addQuery(uri, "tags", p.tags);
            }
        }

        return uri;
    }

    public getStartupRecId(): string {
        var r = this._opts.recId;
        if (r == undefined) {
            return null;
        }
        return r;
    }
}
