import * as trc from './trc2';
import * as html from './trchtml';
import * as trcfx from './trcfx';
import * as gps from './gps';
declare var process: any;  // https://nodejs.org/docs/latest/api/process.html
declare var require : any;

const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});


function failureFunc(statusCode : number) : void 
{
      console.log("*** failed with " + statusCode);
}

function runSample() {
    console.log("Started...");

    var loginUrl = "https://trc-login.voter-science.com";
    var code = process.argv[2];

    if (code == undefined) {
        console.log('First arguemnt should be a canvass code');
        return;
    }

    //var gpsTracker : gps.IGpsTracker = new  gps.GpsTracker();
    //gpsTracker.start(null);
    var gpsTracker = new gps.MockGpsTracker();
    gpsTracker.setLocation({ Lat : 47.6757,  Long : -122.2029 });

    console.log('gps enabled');

    trc.LoginClient.LoginWithCode(loginUrl, code,
        (sheet: trc.Sheet) => {
            console.log("Login successful...");
            
            //result.postUpdateSingleCell('WA003354592', 'Supporter', 'No', () => {});

            trcfx.SheetEx.InitAsync(sheet, gpsTracker, (sheetEx) =>
            {
                console.log("Init ex=" + sheetEx.getName());

                sheetEx.setOtherCallback( (ver, otherDelta) => {
                        console.log('other change:' + ver + "=" + JSON.stringify(otherDelta));
                    });

                sheetEx.postUpdateSingleCell('WA003354592', 'Comments', 'v4', 
                    () => {
                        console.log('successully udpated this cell');
                
                
                        rl.question('What do you think of Node.js? ', (answer : any) => {
                        console.log('Thank you for your valuable feedback:', answer);
                        
                        sheetEx.postUpdateSingleCell('WA003354592', 'Comments', 'v4b', 
                        () => {
                            console.log('successully udpated this cell #2');
                        });

                        rl.close();
                    });
                
                });
            });
        },
        failureFunc);
};

runSample();
