"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const exec_1 = require("@actions/exec");
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
async function capture(cmd, args) {
    const res = {
        stdout: '',
        stderr: '',
        code: null,
    };
    try {
        const code = await exec_1.exec(cmd, args, {
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
        const msg = `Command '${cmd}' failed with args '${args.join(' ')}': ${res.stderr}: ${err}`;
        core.debug(`@actions/exec.exec() threw an error: ${msg}`);
        throw new Error(msg);
    }
}
async function cmd(...args) {
    core.debug(`Executing Git: ${args.join(' ')}`);
    const userArgs = [
        '-c',
        'user.name=github-action-benchmark',
        '-c',
        'user.email=github@users.noreply.github.com',
        '-c',
        'http.https://github.com/.extraheader=',
    ];
    const res = await capture('git', userArgs.concat(args));
    if (res.code !== 0) {
        throw new Error(`Command 'git ${args.join(' ')}' failed: ${JSON.stringify(res)}`);
    }
    return res.stdout;
}
exports.cmd = cmd;
function getRemoteUrl(token) {
    var _a;
    /* eslint-disable @typescript-eslint/camelcase */
    const fullName = (_a = github.context.payload.repository) === null || _a === void 0 ? void 0 : _a.full_name;
    /* eslint-enable @typescript-eslint/camelcase */
    if (!fullName) {
        throw new Error(`Repository info is not available in payload: ${JSON.stringify(github.context.payload)}`);
    }
    return `https://x-access-token:${token}@github.com/${fullName}.git`;
}
async function push(token, branch, ...options) {
    core.debug(`Executing 'git push' to branch '${branch}' with token and options '${options.join(' ')}'`);
    const remote = getRemoteUrl(token);
    let args = ['push', remote, `${branch}:${branch}`, '--no-verify'];
    if (options.length > 0) {
        args = args.concat(options);
    }
    return cmd(...args);
}
exports.push = push;
async function pull(token, branch, ...options) {
    core.debug(`Executing 'git pull' to branch '${branch}' with token and options '${options.join(' ')}'`);
    const remote = token !== undefined ? getRemoteUrl(token) : 'origin';
    let args = ['pull', remote, branch];
    if (options.length > 0) {
        args = args.concat(options);
    }
    return cmd(...args);
}
exports.pull = pull;
//# sourceMappingURL=git.js.map