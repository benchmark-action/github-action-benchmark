"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const actionsExec = __importStar(require("@actions/exec"));
const core = __importStar(require("@actions/core"));
async function exec(cmd, args) {
    const res = {
        stdout: '',
        stderr: '',
        code: null,
    };
    try {
        const code = await actionsExec.exec(cmd, args, {
            listeners: {
                stdout(data) {
                    res.stdout += data.toString();
                },
                stderr(data) {
                    res.stderr += data.toString();
                },
            },
        });
        res.code = code;
        return res;
    }
    catch (err) {
        core.debug(JSON.stringify(res));
        throw err;
    }
}
async function git(...args) {
    const res = await exec('git', args);
    if (res.code !== 0) {
        throw new Error(`Command 'git ${args.join(' ')}' failed: ${res}`);
    }
    return res.stdout;
}
exports.default = git;
//# sourceMappingURL=git.js.map