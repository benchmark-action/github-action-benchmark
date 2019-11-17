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
const VALID_TOOLS = ['cargo', 'go', 'benchmarkjs', 'pytest'];
function validateToolType(tool) {
    if (VALID_TOOLS.includes(tool)) {
        return;
    }
    throw new Error(`Invalid value '${tool}' for 'tool' input. It must be one of ${VALID_TOOLS}`);
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
function validateAutoPush(autoPush, githubToken) {
    if (!autoPush) {
        return;
    }
    if (!githubToken) {
        throw new Error("'auto-push' is enabled but 'github-token' is not set. Please give API token for pushing GitHub pages branch to remote");
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
async function configFromJobInput() {
    const tool = core.getInput('tool');
    let outputFilePath = core.getInput('output-file-path');
    const ghPagesBranch = core.getInput('gh-pages-branch');
    let benchmarkDataDirPath = core.getInput('benchmark-data-dir-path');
    const name = core.getInput('name');
    const githubToken = core.getInput('github-token') || undefined;
    const autoPush = getBoolInput('auto-push');
    validateToolType(tool);
    outputFilePath = await validateOutputFilePath(outputFilePath);
    validateGhPagesBranch(ghPagesBranch);
    benchmarkDataDirPath = validateBenchmarkDataDirPath(benchmarkDataDirPath);
    validateName(name);
    validateAutoPush(autoPush, githubToken);
    return { name, tool, outputFilePath, ghPagesBranch, benchmarkDataDirPath, githubToken, autoPush };
}
exports.configFromJobInput = configFromJobInput;
//# sourceMappingURL=config.js.map