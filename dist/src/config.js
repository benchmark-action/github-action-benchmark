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
exports.configFromJobInput = exports.VALID_TOOLS = void 0;
const core = __importStar(require("@actions/core"));
const fs_1 = require("fs");
const os = __importStar(require("os"));
const path = __importStar(require("path"));
exports.VALID_TOOLS = [
    'cargo',
    'go',
    'benchmarkjs',
    'benchmarkluau',
    'pytest',
    'googlecpp',
    'catch2',
    'julia',
    'jmh',
    'benchmarkdotnet',
    'customBiggerIsBetter',
    'customSmallerIsBetter',
];
const RE_UINT = /^\d+$/;
function validateToolType(tool) {
    if (exports.VALID_TOOLS.includes(tool)) {
        return;
    }
    throw new Error(`Invalid value '${tool}' for 'tool' input. It must be one of ${exports.VALID_TOOLS}`);
}
function resolvePath(p) {
    if (p.startsWith('~')) {
        const home = os.homedir();
        if (!home) {
            throw new Error(`Cannot resolve '~' in ${p}`);
        }
        p = path.join(home, p.slice(1));
    }
    return path.resolve(p);
}
async function resolveFilePath(p) {
    p = resolvePath(p);
    let s;
    try {
        s = await fs_1.promises.stat(p);
    }
    catch (e) {
        throw new Error(`Cannot stat '${p}': ${e}`);
    }
    if (!s.isFile()) {
        throw new Error(`Specified path '${p}' is not a file`);
    }
    return p;
}
async function validateOutputFilePath(filePath) {
    try {
        return await resolveFilePath(filePath);
    }
    catch (err) {
        throw new Error(`Invalid value for 'output-file-path' input: ${err}`);
    }
}
function validateGhPagesBranch(branch) {
    if (branch) {
        return;
    }
    throw new Error(`Branch value must not be empty for 'gh-pages-branch' input`);
}
function validateBenchmarkDataDirPath(dirPath) {
    try {
        return resolvePath(dirPath);
    }
    catch (e) {
        throw new Error(`Invalid value for 'benchmark-data-dir-path': ${e}`);
    }
}
function validateName(name) {
    if (name) {
        return;
    }
    throw new Error('Name must not be empty');
}
function validateGitHubToken(inputName, githubToken, todo) {
    if (!githubToken) {
        throw new Error(`'${inputName}' is enabled but 'github-token' is not set. Please give API token ${todo}`);
    }
}
function getBoolInput(name) {
    const input = core.getInput(name);
    if (!input) {
        return false;
    }
    if (input !== 'true' && input !== 'false') {
        throw new Error(`'${name}' input must be boolean value 'true' or 'false' but got '${input}'`);
    }
    return input === 'true';
}
function getPercentageInput(name) {
    const input = core.getInput(name);
    if (!input) {
        return null;
    }
    if (!input.endsWith('%')) {
        throw new Error(`'${name}' input must ends with '%' for percentage value (e.g. '200%')`);
    }
    const percentage = parseFloat(input.slice(0, -1)); // Omit '%' at last
    if (isNaN(percentage)) {
        throw new Error(`Specified value '${input.slice(0, -1)}' in '${name}' input cannot be parsed as float number`);
    }
    return percentage / 100;
}
function getCommaSeparatedInput(name) {
    const input = core.getInput(name);
    if (!input) {
        return [];
    }
    return input.split(',').map((s) => s.trim());
}
function validateAlertCommentCcUsers(users) {
    for (const u of users) {
        if (!u.startsWith('@')) {
            throw new Error(`User name in 'alert-comment-cc-users' input must start with '@' but got '${u}'`);
        }
    }
}
async function isDir(path) {
    try {
        const s = await fs_1.promises.stat(path);
        return s.isDirectory();
    }
    catch (_) {
        return false;
    }
}
async function validateExternalDataJsonPath(path, autoPush) {
    if (!path) {
        return Promise.resolve(undefined);
    }
    if (autoPush) {
        throw new Error('auto-push must be false when external-data-json-path is set since this action reads/writes the given JSON file and never pushes to remote');
    }
    try {
        const p = resolvePath(path);
        if (await isDir(p)) {
            throw new Error(`Specified path '${p}' must be file but it is actually directory`);
        }
        return p;
    }
    catch (err) {
        throw new Error(`Invalid value for 'external-data-json-path' input: ${err}`);
    }
}
function getUintInput(name) {
    const input = core.getInput(name);
    if (!input) {
        return null;
    }
    if (!RE_UINT.test(input)) {
        throw new Error(`'${name}' input must be unsigned integer but got '${input}'`);
    }
    const i = parseInt(input, 10);
    if (isNaN(i)) {
        throw new Error(`Unsigned integer value '${input}' in '${name}' input was parsed as NaN`);
    }
    return i;
}
function validateMaxItemsInChart(max) {
    if (max !== null && max <= 0) {
        throw new Error(`'max-items-in-chart' input value must be one or more but got ${max}`);
    }
}
function validateAlertThreshold(alertThreshold, failThreshold) {
    if (alertThreshold === null) {
        throw new Error("'alert-threshold' input must not be empty");
    }
    if (failThreshold && alertThreshold > failThreshold) {
        throw new Error(`'alert-threshold' value must be smaller than 'fail-threshold' value but got ${alertThreshold} > ${failThreshold}`);
    }
}
async function configFromJobInput() {
    const tool = core.getInput('tool');
    let outputFilePath = core.getInput('output-file-path');
    const ghPagesBranch = core.getInput('gh-pages-branch');
    const ghRepository = core.getInput('gh-repository');
    let benchmarkDataDirPath = core.getInput('benchmark-data-dir-path');
    const name = core.getInput('name');
    const githubToken = core.getInput('github-token') || undefined;
    const ref = core.getInput('ref') || undefined;
    const autoPush = getBoolInput('auto-push');
    const skipFetchGhPages = getBoolInput('skip-fetch-gh-pages');
    const commentAlways = getBoolInput('comment-always');
    const summaryAlways = getBoolInput('summary-always');
    const saveDataFile = getBoolInput('save-data-file');
    const commentOnAlert = getBoolInput('comment-on-alert');
    const alertThreshold = getPercentageInput('alert-threshold');
    const failOnAlert = getBoolInput('fail-on-alert');
    const alertCommentCcUsers = getCommaSeparatedInput('alert-comment-cc-users');
    let externalDataJsonPath = core.getInput('external-data-json-path');
    const maxItemsInChart = getUintInput('max-items-in-chart');
    let failThreshold = getPercentageInput('fail-threshold');
    validateToolType(tool);
    outputFilePath = await validateOutputFilePath(outputFilePath);
    validateGhPagesBranch(ghPagesBranch);
    benchmarkDataDirPath = validateBenchmarkDataDirPath(benchmarkDataDirPath);
    validateName(name);
    if (autoPush) {
        validateGitHubToken('auto-push', githubToken, 'to push GitHub pages branch to remote');
    }
    if (commentAlways) {
        validateGitHubToken('comment-always', githubToken, 'to send commit comment');
    }
    if (commentOnAlert) {
        validateGitHubToken('comment-on-alert', githubToken, 'to send commit comment on alert');
    }
    if (ghRepository) {
        validateGitHubToken('gh-repository', githubToken, 'to clone the repository');
    }
    validateAlertThreshold(alertThreshold, failThreshold);
    validateAlertCommentCcUsers(alertCommentCcUsers);
    externalDataJsonPath = await validateExternalDataJsonPath(externalDataJsonPath, autoPush);
    validateMaxItemsInChart(maxItemsInChart);
    if (failThreshold === null) {
        failThreshold = alertThreshold;
    }
    return {
        name,
        tool,
        outputFilePath,
        ghPagesBranch,
        ghRepository,
        benchmarkDataDirPath,
        githubToken,
        autoPush,
        skipFetchGhPages,
        commentAlways,
        summaryAlways,
        saveDataFile,
        commentOnAlert,
        alertThreshold,
        failOnAlert,
        alertCommentCcUsers,
        externalDataJsonPath,
        maxItemsInChart,
        failThreshold,
        ref,
    };
}
exports.configFromJobInput = configFromJobInput;
//# sourceMappingURL=config.js.map