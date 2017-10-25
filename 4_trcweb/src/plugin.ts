
//---------------------------------------------------------
// Used for TrcWeb plugin model.  

import * as XC from 'trc-httpshim/xclient'
import * as common from 'trc-httpshim/common'

// PluginMain(IStart, IPluginOptions)
export interface IStart {
    // The auth parameter for accessing this sheet. scheme is 'Bearer'
    AuthToken: string;

    // The URL endpoint to access this sheet at. This may be different than the login server. 
    Server: string;

    // The unique Sheet Identifier for accessing this sheet. 
    SheetId: string;
}

export interface IPluginOptions {
    // If set, starting recId to display
    recId: string;

    // UrlBase for jumping to another plugin.    
    gotoUrl: string;
}


export class PluginClient {
    // Options 
    public SheetId: string;
    public RecId: string;

    public HttpClient : XC.XClient;

    public constructor(
        sheet: IStart,
        opts: IPluginOptions,
        geoProvider: common.IGeoPointProvider = null
    ) {
        var jwt = sheet.AuthToken;
        var url = sheet.Server;
        var xc = XC.XClient.New(url, jwt, geoProvider);
        this.HttpClient = xc;

        if (sheet.SheetId != undefined) {
            this.SheetId = sheet.SheetId;
        }
        if (opts != undefined) {
            if (opts.recId != undefined) {
                this.RecId = opts.recId;

            }
        }
    }
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

    /*
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
    }*/

    /*
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
    }*/

    public getStartupRecId(): string {
        var r = this._opts.recId;
        if (r == undefined) {
            return null;
        }
        return r;
    }
}
