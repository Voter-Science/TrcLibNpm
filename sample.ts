import * as trc from './trc2';
declare var process: any;  // https://nodejs.org/docs/latest/api/process.html

function runSample() {
    console.log("Started...");

    var loginUrl = "https://trc-login.voter-science.com";
    var code = process.argv[2];

    if (code == undefined) {
        console.log('First arguemnt should be a canvass code');
        return;
    }


    trc.LoginClient.LoginWithCode(loginUrl, code,
        (result: trc.Sheet) => {
            console.log("Login successful...");
            result.getInfo(info => {
                console.log("Sheet info:" + info.Name);
            });
        },
        (statusCode: number) => {
            console.log("*** failed with " + statusCode);
        });
};

runSample();
