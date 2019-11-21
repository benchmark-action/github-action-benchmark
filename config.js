"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const fs_1 = require("fs");
const os = __importStar(require("os"));
const path = __importStar(require("path"));
exports.VALID_TOOLS = ['cargo', 'go', 'benchmarkjs', 'pytest'];
function validateToolType(tool) {
    if (exports.VALID_TOOLS.includes(tool)) {
        return;
    }
    throw new Error(`Invalid value '${tool}' for 'tool' input. It must be one of ${exports.VALID_TOOLS}`);
}
function resolvePath(p) {
    if (p[0] === '~') {
        const home = os.homedir();
        if (!home) {
            throw new Error("Cannot resolve '~'");
        }
        p = path.join(home, p.slice(1));
    }
    return path.resolve(p);
}
async function statPath(p) {
    p = resolvePath(p);
    try {
        return [await fs_1.promises.stat(p), p];
    }
    catch (e) {
        throw new Error(`Cannot stat '${p}': ${e}`);
    }
}
async function validateOutputFilePath(filePath) {
    try {
        const [stat, resolved] = await statPath(filePath);
        if (!stat.isFile()) {
            throw new Error(`Specified path '${filePath}' is not a file`);
        }
        return resolved;
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
    return input.split(',').map(s => s.trim());
}
function validateAlertCommentCcUsers(users) {
    for (const u of users) {
        if (!u.startsWith('@')) {
            throw new Error(`User name in 'alert-comment-cc-users' input must start with '@' but got '${u}'`);
        }
    }
}
async function configFromJobInput() {
    const tool = core.getInput('tool');
    let outputFilePath = core.getInput('output-file-path');
    const ghPagesBranch = core.getInput('gh-pages-branch');
    let benchmarkDataDirPath = core.getInput('benchmark-data-dir-path');
    const name = core.getInput('name');
    const githubToken = core.getInput('github-token') || undefined;
    const autoPush = getBoolInput('auto-push');
    const skipFetchGhPages = getBoolInput('skip-fetch-gh-pages');
    const commentOnAlert = getBoolInput('comment-on-alert');
    const alertThreshold = getPercentageInput('alert-threshold');
    const failOnAlert = getBoolInput('fail-on-alert');
    const alertCommentCcUsers = getCommaSeparatedInput('alert-comment-cc-users');
    validateToolType(tool);
    outputFilePath = await validateOutputFilePath(outputFilePath);
    validateGhPagesBranch(ghPagesBranch);
    benchmarkDataDirPath = validateBenchmarkDataDirPath(benchmarkDataDirPath);
    validateName(name);
    if (autoPush) {
        validateGitHubToken('auto-push', githubToken, 'to push GitHub pages branch to remote');
    }
    if (commentOnAlert) {
        validateGitHubToken('comment-on-alert', githubToken, 'to send commit comment on alert');
    }
    validateAlertCommentCcUsers(alertCommentCcUsers);
    return {
        name,
        tool,
        outputFilePath,
        ghPagesBranch,
        benchmarkDataDirPath,
        githubToken,
        autoPush,
        skipFetchGhPages,
        commentOnAlert,
        alertThreshold,
        failOnAlert,
        alertCommentCcUsers,
    };
}
exports.configFromJobInput = configFromJobInput;
//# sourceMappingURL=config.js.map