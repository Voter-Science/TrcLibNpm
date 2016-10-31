// Adhoc testing 

import * as trc from './trc2';
import * as html from './trchtml';
import * as trcfx from './trcfx';
import * as poly  from './polygonHelper';
import * as gps from './gps';
declare var process: any;  // https://nodejs.org/docs/latest/api/process.html
declare var require: any;

const readline = require('readline');

function failureFunc(error: trc.ITrcError): void {
    console.log("*** failed with " + error.Code + " : " + error.Message);
}

function runSample() {
    console.log("Started...");

    var loginUrl = "https://trc-login.voter-science.com"; // "http://localhost:40176"; //  
    var code = process.argv[2];

    if (code == undefined) {
        console.log('First argument should be a canvass code');
        return;
    }

    console.log('gps enabled');

    trc.LoginClient.LoginWithCode(loginUrl, code,
        (sheet: trc.Sheet) => {
            console.log("Login successful...");

            testExactDeltas(sheet);
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

function testFindVersion(sheet: trc.Sheet): void {
    var date = new Date(2016, 8, 4);
    console.log("Find ver at : " + date);
    sheet.findVersion(date, (version : number) => {
        console.log("Version=" + version);
    }, failureFunc);
}

function testUserInfo(sheet: trc.Sheet): void {
    console.log("User info:");
    sheet.getUserInfo( (info) => {
        console.log(info.Name);
        console.log(info.SheetId);
    });
}



function testDeltasCallback(segment: trc.DeltaEnumerator): void {
    console.log(">> segment break");
    for (var i in segment.Results) {
        var delta = segment.Results[i];
        console.log(delta.Version + "," + delta.User);
    }

    if (segment.NextLink == null) {
        console.log("!! Done!! ");
    } else {
        segment.GetNext(testDeltasCallback);
    }
}

function testDeltas(sheet: trc.Sheet): void {
    console.log("Print deltas");
    sheet.getDeltas(testDeltasCallback);
}

function testExactDeltas(sheet: trc.Sheet): void {
    var version = 9966;
    console.log("Get delta at:" + version);
    sheet.getDeltas( (segment) => {
        var item=segment.Results[0];
        console.log("Time: " + item.Timestamp);
        console.log("User: " + item.User);
    }, version, version+1);
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
