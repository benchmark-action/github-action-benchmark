"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetch = exports.pull = exports.push = exports.cmd = exports.getServerName = exports.getServerUrl = void 0;
const exec_1 = require("@actions/exec");
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
const url_1 = require("url");
const DEFAULT_GITHUB_URL = 'https://github.com';
async function capture(cmd, args) {
    const res = {
        stdout: '',
        stderr: '',
        code: null,
    };
    try {
        const code = await (0, exec_1.exec)(cmd, args, {
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
function getServerUrl(repositoryUrl) {
    const urlObj = repositoryUrl ? new url_1.URL(repositoryUrl) : new url_1.URL(DEFAULT_GITHUB_URL);
    return repositoryUrl ? urlObj.origin : DEFAULT_GITHUB_URL;
}
exports.getServerUrl = getServerUrl;
function getServerName(repositoryUrl) {
    const urlObj = repositoryUrl ? new url_1.URL(repositoryUrl) : new url_1.URL(DEFAULT_GITHUB_URL);
    return repositoryUrl ? urlObj.hostname : DEFAULT_GITHUB_URL.replace('https://', '');
}
exports.getServerName = getServerName;
async function cmd(...args) {
    var _a;
    core.debug(`Executing Git: ${args.join(' ')}`);
    const serverUrl = getServerUrl((_a = github.context.payload.repository) === null || _a === void 0 ? void 0 : _a.html_url);
    const userArgs = [
        '-c',
        'user.name=github-action-benchmark',
        '-c',
        'user.email=github@users.noreply.github.com',
        '-c',
        `http.${serverUrl}/.extraheader=`, // This config is necessary to support actions/checkout@v2 (#9)
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
    const { repo, owner } = github.context.repo;
    const serverName = getServerName((_a = github.context.payload.repository) === null || _a === void 0 ? void 0 : _a.html_url);
    return `https://x-access-token:${token}@${serverName}/${owner}/${repo}.git`;
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
async function fetch(token, branch, ...options) {
    core.debug(`Executing 'git fetch' for branch '${branch}' with token and options '${options.join(' ')}'`);
    const remote = token !== undefined ? getRemoteUrl(token) : 'origin';
    let args = ['fetch', remote, `${branch}:${branch}`];
    if (options.length > 0) {
        args = args.concat(options);
    }
    return cmd(...args);
}
exports.fetch = fetch;
//# sourceMappingURL=git.js.map