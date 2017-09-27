// Adhoc testing 

import * as trc from './trc2';
import * as html from './trchtml';
import * as trcfx from './trcfx';
import * as poly from './polygonHelper';
import * as gps from './gps';
declare var process: any;  // https://nodejs.org/docs/latest/api/process.html
declare var require: any;
import * as Promise from 'bluebird';

const readline = require('readline');

function failureFunc(error: trc.ITrcError): void {
    console.log("*** failed with " + error.Code + " : " + error.Message);
}

function runSample() {
    console.log("Started2...");

    var loginUrl = "https://trc-login.voter-science.com";
    //var loginUrl = "http://localhost:40176"; //  

    var code = process.argv[2];

    if (code == undefined) {
        console.log('First argument should be a canvass code');
        return;
    }

    console.log('gps enabled');

    trc.LoginClient.LoginWithCode(loginUrl, code,
        (sheet: trc.Sheet) => {

            console.log("Login successful...");

            //TODO: test LoginClient.LoginWithCodeAsync
            //TODO: test DeltaEnumerator.GetNextAsync

            //testGetCustomDataAsync(sheet);
            //testPostCustomDataAsync(sheet);
            //testDeleteChildSheetAsync(sheet);
            //testPatchChildSheetFromRecIdsAsync(sheet);

            testRebase(sheet);
            //testGetOpsStatusAsync(sheet);

            //testListCustomDataAsync(sheet);
            //testCreateShareCodeAsync(sheet);
            //testCreateChildSheetAsync(sheet);
            //testCreateChildSheetFromRecIdsAsync(sheet);
            //testCreateChildSheetFromFilterAsync(sheet);
            //testGetChildrenAsync(sheet);
            //testGetDeltasAsync(sheet);
            //testGetDeltaAsync(sheet);
            //testFindVersionAsync(sheet);
            //testPostUpdateAsync(sheet);
            //testPostUpdateSingleowAsync(sheet);
            //testPostUpdateSingleCellAsync(sheet);
            //testGetRecIds(sheet);
            //testGetSheetContentsAsync(sheet).then( () => { console.log("!!! Done Xxxx "); });
            //testGetInfoAsync(sheet);
            //testGetSummaryAsyncAsync(sheet);
            //testExactDeltas(sheet);
            // testFindVersion(sheet);
            // testUserInfo(sheet);
            /*
                        sheet.getSheetContents((data) => {
            
                        }, "IsTrue(xxx) && IsFalse(yyy) && xxx=='yyy'",
                            null,
                            (error: trc.ITrcError) => {
            
                                console.log("Error: " + error.Message);
                            });
            */

            // testDeltas(sheet);

            //testPoly(sheet);
            //testPoly2(sheet);

            //testChanges(sheet);
            //testChild(sheet);
            //testCreateChildFilter(sheet);
            //testDeleteChildFilter(sheet, "9dfcd5e73f5542fba437d3e4f12d732e");
            //testQuery(sheet);

            //testShareCode(sheet);
        }, failureFunc);

    console.log("done");
}

function testListCustomDataAsync(sheet: trc.Sheet) {
    //var p = new poly.PolygonHelper(sheet);

    sheet.listCustomDataAsync(trc.PolygonKind)
        .then((result: trc.ICustomDataEntry[]) => {
            console.log("listed custom data");
        })
        .catch((error: trc.ITrcError) => {
            console.error("failed to list custom data");
            console.error(error);
        });
}

function testDeleteCustomDataAsync(sheet: trc.Sheet) {
    sheet.deleteCustomDataAsync("some", "idunno")
        .then((result: any) => {
            console.log("deleted custom data");
        })
        .catch((error: trc.ITrcError) => {
            console.error("failed to delete custom data");
            console.error(error);
        });
}

function testGetCustomDataAsync(sheet: trc.Sheet) {
    sheet.getCustomDataAsync("some", "idunno")
        .then((result: trc.ICustomDataRequest) => {
            console.log("got custom data");
        })
        .catch((error: trc.ITrcError) => {
            console.error("failed to get custom data");
            console.error(error);
        })
}

function testPostCustomDataAsync(sheet: trc.Sheet) {

    var body: trc.ICustomDataRequest = {
        FriendlyName: "",
        Etag: "",
        Value: ""
    };
    sheet.postCustomDataAsync("", "", body)
        .then((result: trc.IPostDataResponse) => {
            console.log("posted custom data");
        })
        .catch((error: trc.ITrcError) => {
            console.error("failed to post custom data");
            console.error(error);
        });
}

function testCreateShareCodeAsync(sheet: trc.Sheet) {
    sheet.createShareCodeAsync("abc@asdf.com", false)
        .then((result: string) => {
            console.log("created share code");
            console.log(result);
        })
        .catch((error: trc.ITrcError) => {
            console.error("failed to create share code");
            console.error(error);
        });
}

function testDeleteChildSheetAsync(sheet: trc.Sheet) {
    sheet.deleteChildSheetAsync("1")
        .then((result: any) => {
            console.log("deleted child sheet");
        })
        .catch((error: trc.ITrcError) => {
            console.error("failed to delete child sheet");
            console.error(error);
        });
}
function testPatchChildSheetFromRecIdsAsync(sheet: trc.Sheet) {
    sheet.patchChildSheetFromRecIdsAsync("1", [])
        .then((result: any) => {
            console.log("patched child sheet from rec ids")
        })
        .catch((error: trc.ITrcError) => {
            console.error("failed to patch child sheet from rec ids");
            console.error(error);
        });
}

function testCreateChildSheetAsync(sheet: trc.Sheet) {
    //TODO: getting 'missing body' error, so falling into 'catch'
    sheet.createChildSheetAsync(null)
        .then((result: trc.Sheet) => {
            console.log("created child sheet");
            console.log(result);
        })
        .catch((error: trc.ITrcError) => {
            console.error("failed to create child sheet");
            console.error(error);
        });
}

function testCreateChildSheetFromRecIdsAsync(sheet: trc.Sheet) {
    sheet.createChildSheetFromRecIdsAsync("some name", [])
        .then((result: trc.Sheet) => {
            console.log("created child sheet from recids");
            console.log(result);
        })
        .catch((error: trc.ITrcError) => {
            console.error("failed to create child sheet from recids");
            console.error(error);
        });
}

function testCreateChildSheetFromFilterAsync(sheet: trc.Sheet) {
    sheet.createChildSheetFromFilterAsync("Test-M2a", "LastName=='MARTINS'", true)
        .then((result: trc.Sheet) => {
            console.log("created child sheet from filter");
            console.log(result);
        })
        .catch((error: trc.ITrcError) => {
            console.error("failed to create child sheet from filter");
            console.error(error);
        });
}

function testGetChildrenAsync(sheet: trc.Sheet) {
    sheet.getChildrenAsync()
        .then((result: trc.IGetChildrenResultEntry[]) => {
            console.log("got children");
            console.log(result);
        })
        .catch((error: trc.ITrcError) => {
            console.error("failed to get children");
            console.error("error");
        });
}

function testGetDeltaAsync(sheet: trc.Sheet) {
    //TODO: delta does not exist yet, so falling into catch
    sheet.getDeltaAsync(0)
        .then((result: trc.ISheetContents) => {
            console.log("got delta:");
            console.log(result);
        })
        .catch((err: trc.ITrcError) => {
            console.error("Failed to get delta");
            console.error(err);
        });
}

function testFindVersionAsync(sheet: trc.Sheet) {
    sheet.findVersionAsync(
        new Date(2016, 8, 4))
        .then((result: number) => {
            console.log("found version number");
            console.log(result);
        })
        .catch((err: trc.ITrcError) => {
            console.error("failed to find version number");
            console.error(err);
        });
}

function testPostUpdateAsync(sheet: trc.Sheet) {
    sheet.getSheetContentsAsync()
        .then((toUpdate: trc.ISheetContents) => {
            //TODO: this is not valid setup, so we're seeing the 'catch' output
            toUpdate["RecId"] = ["WA003275409"];
            sheet.postUpdateAsync(toUpdate, { Lat: 29.123, Long: 29.321 })
                .then((result2: trc.IUpdateSheetResult) => {
                    console.log("posted update:");
                    console.log(result2);
                })
                .catch((err: trc.ITrcError) => {
                    console.error("failed to post update async");
                    console.error(err);
                });
        });
}

function testPostUpdateSingleowAsync(sheet: trc.Sheet) {
    sheet.postUpdateSingleRowAsync(
        "WA003275409", ["Party", "Supporter"], ["2", "1"], { Lat: 29.321, Long: 23.312 })
        .then((result: trc.IUpdateSheetResult) => {
            console.log("updated single row:");
            console.log(result);
        })
        .catch((err: trc.ITrcError) => {
            console.error("updatesinglerow errored");
            console.error(err);
        });
}

function testPostUpdateSingleCellAsync(sheet: trc.Sheet) {
    sheet.postUpdateSingleCellAsync(
        "WA003275409", "Party", "2", { Lat: 29.321, Long: 23.312 })
        .then((result: trc.IUpdateSheetResult) => {
            console.log("updated single cell:");
            console.log(result);
        })
        .catch((err: trc.ITrcError) => {
            console.error("updatesinglecell errored");
            console.error(err);
        });
}

function testGetRecIds(sheet: trc.Sheet) {
    sheet.getRecIdsAsync()
        .then((result: trc.ISheetContents) => {
            console.log("got recIds:");
            console.log(result["RecId"].length);
        })
        .catch((err: trc.ITrcError) => {
            console.error("getRecIdsAsync errored:");
            console.error(err);
        });
}

function testGetSheetContentsAsync(sheet: trc.Sheet): Promise<void> {
    var x: Promise<void> = sheet.getSheetContentsAsync()
        .then((result: trc.ISheetContents) => {
            console.log("got sheet contents");
            console.log(result);
        })
        .catch((err: trc.ITrcError) => {
            console.error("getSheetContentsAsync errored:");
            console.error(err);
        });
    return x;
}

function testRebase(sheet: trc.Sheet): Promise<void> {

    return sheet.getRebaseLogAsync().then(result => {
        console.log("got sheet contents");
        result.ForEach( item => {
            console.log(item);
        });
        
    });
}

function testGetOpsStatusAsync(sheet: trc.Sheet): Promise<void> {

    return sheet.postOpRefresh().then(

        () => {
            sheet.getOpStatus()
                .then((result: trc.IMaintenanceStatus) => {
                    console.log("got sheet contents");
                    console.log(result);
                })
                .catch((err: trc.ITrcError) => {
                    console.error("testGetStatusAsync errored:");
                    console.error(err);
                });
        }
    );
}

function testGetSummaryAsyncAsync(sheet: trc.Sheet): Promise<void> {
    var x: Promise<void> = sheet.getChildrenSummaryAsync()
        .then((result: trc.IChildSummaryInfoEntry[]) => {
            console.log("got children sumamary");
            for (var i in result) {
                var key = result[i];
                console.log(key.ChildInfo.Name);
                // Dump shareSandbox
                var shares = key.ShareInfo;
                for (var j in shares) {
                    var share = shares[j];
                    console.log(share.Email);
                }
            }
            console.log(result);
        })
        .catch((err: trc.ITrcError) => {
            console.error("testGetSummaryAsyncAsync errored:");
            console.error(err);
        });
    return x;
}



function testGetInfoAsync(sheet: trc.Sheet): void {
    sheet.getInfoAsync().then((result: trc.ISheetInfoResult) => {
        console.log("result.CountRecords=");
        console.log(result.CountRecords);
    }).catch((err: trc.ITrcError) => {
        console.error("there was an error");
        console.error(err);
    });
}

function testFindVersion(sheet: trc.Sheet): void {
    var date = new Date(2016, 8, 4);
    console.log("Find ver at : " + date);
    sheet.findVersion(date, (version: number) => {
        console.log("Version=" + version);
    }, failureFunc);
}

function testUserInfo(sheet: trc.Sheet): void {
    console.log("User info:");
    sheet.getUserInfo((info) => {
        console.log(info.Name);
        console.log(info.SheetId);
    });
}


function testGetDeltasAsync(sheet: trc.Sheet): void {
    var count = 0;
    sheet.getDeltasAsync().then(de => {
        return de.ForEach(item => {
            count++;
        })
    }).then(() => {
        console.log("Done:" + count);
    });
}

function testPoly2(sheet: trc.Sheet): void {
    console.log("poly2");
    var p = new poly.PolygonHelper(sheet);

    sheet.listCustomData(trc.PolygonKind, (result) => {
        for (var i = 0; i < result.length; i++) {
            var entry = result[i];
            console.log(entry.Name + "," + entry.DataId);

            sheet.deleteCustomData(trc.PolygonKind, entry.DataId, () => { "  ok" });
        }
    });
}

function testPoly(sheet: trc.Sheet): void {
    console.log("poly1");
    var p = new poly.PolygonHelper(sheet);
    p.createPolygon("t1", [
        { Lat: 47.80, Long: -122.2 },
        { Lat: 47.81, Long: -122.2 },
        { Lat: 47.81, Long: -122.0 },
        { Lat: 47.80, Long: -122.0 },
        { Lat: 47.80, Long: -122.2 }
    ],
        (dataId) => {
            console.log('polyId = ' + dataId);

            sheet.getSheetContents(contents => {
                console.log(JSON.stringify(contents));

                p.lookupNameFromId("t1", (d2) => {
                    console.log("Lookup2=" + d2);

                    console.log("test delete:");
                    sheet.deleteCustomData(trc.PolygonKind, dataId, () => {
                        console.log("  ok:" + dataId);
                    });
                })

            }, "IsInPolygon('" + dataId + "',Lat,Long)");
        });

}

function testShareCode(sheet: trc.Sheet): void {
    sheet.createShareCode("info@voter-science.com", true,
        (newCode) => {
            console.log("created: " + newCode);
        });
}

// Uses filter & select to query a sheet. 
function testQuery(sheet: trc.Sheet): void {
    sheet.getSheetContents((data) => {
        console.log(JSON.stringify(data)); // cheap way to dump a sheet       
    },
        "LastName=='Martins'",
        ["RecId", "FirstName", "LastName"]);
}

function testCreateChildFilter(sheet: trc.Sheet): void {
    var shareSandbox: boolean = true;
    sheet.createChildSheetFromFilter("Test-M2", "LastName=='MARTINS'", shareSandbox,
        (childSheet) => {
            console.log('success, id=' + childSheet.getId());
            childSheet.getInfo(result => {
                console.log("success. #records=" + result.CountRecords);
            });
        },
        failureFunc);
}

function testDeleteChildFilter(sheet: trc.Sheet, idToDelete: string): void {
    // Must share a sandbox in order to delete it. 
    sheet.deleteChildSheet(idToDelete,
        () => console.log('successfully deleted'),
        failureFunc);
}

function testChild(sheet: trc.Sheet): void {
    console.log("enum children:");
    sheet.getChildren(children => {
        console.log('**count=' + children.length);
        for (var i = 0; i < children.length; i++) {
            var child = children[i];
            console.log(child.Name + " " + child.Id + " " + child.Filter);
        }
    });
}

//var gpsTracker : gps.IGpsTracker = new  gps.GpsTracker();
//gpsTracker.start(null);
var gpsTracker = new gps.MockGpsTracker();
gpsTracker.setLocation({ Lat: 47.6757, Long: -122.2029 });

function testChanges(sheet: trc.Sheet): void {
    //result.postUpdateSingleCell('WA003354592', 'Supporter', 'No', () => {});

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    trcfx.SheetEx.InitAsync(sheet, gpsTracker, (sheetEx) => {
        console.log("Init ex=" + sheetEx.getName());

        sheetEx.setOtherCallback((ver, otherDelta) => {
            console.log('other change:' + ver + "=" + JSON.stringify(otherDelta));
        });

        sheetEx.postUpdateSingleCell('WA003354592', 'Comments', 'v4',
            () => {
                console.log('successully udpated this cell');


                rl.question('What do you think of Node.js? ', (answer: any) => {
                    console.log('Thank you for your valuable feedback:', answer);

                    sheetEx.postUpdateSingleCell('WA003354592', 'Comments', 'v4b',
                        () => {
                            console.log('successully udpated this cell #2');
                        });

                    rl.close();
                });

            });
    });
}

runSample();
