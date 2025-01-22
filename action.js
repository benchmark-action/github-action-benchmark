/* eslint @typescript-eslint/no-var-requires: 0 */
var exec = require('child_process').exec;

async function myexec(command, callback) {
    console.log(command);
    var cmd = await exec(command, function (err, stdout, stderr) {
        if (err) {
            console.error(err);
        }
        //console.log(cmd);
        console.log(stdout);
        callback();
    });
}

function nop() {
    return;
}
function actualScript(actionDir) {
    require(`${actionDir}/dist/src/index.js`);
}

async function main() {
    var origDir = process.cwd();
    process.chdir(__dirname);
    await myexec(`npm install`, async () => {
        await myexec(`npm run build`, () => {
            process.chdir(origDir);
            actualScript(__dirname);
        }).then(() => {
            return;
        });
    });
}

main();
