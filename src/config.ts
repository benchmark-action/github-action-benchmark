import * as core from '@actions/core';
import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';

export type ToolType = typeof VALID_TOOLS[number];
export interface Config {
    name: string;
    tool: ToolType;
    outputFilePath: string;
    ghPagesBranch: string;
    ghRepository: string | undefined;
    benchmarkDataDirPath: string;
    githubToken: string | undefined;
    autoPush: boolean;
    skipFetchGhPages: boolean;
    commentAlways: boolean;
    summaryAlways: boolean;
    saveDataFile: boolean;
    commentOnAlert: boolean;
    alertThreshold: number;
    failOnAlert: boolean;
    failThreshold: number;
    alertCommentCcUsers: string[];
    externalDataJsonPath: string | undefined;
    maxItemsInChart: number | null;
    ref: string | undefined;
    nyrkioEnable: boolean;
    nyrkioToken: string | null;
    nyrkioApiRoot: string;
    nyrkioPublic: boolean;
    nyrkioOrg: string | undefined;
    nyrkioPvalue: number | null;
    nyrkioThreshold: number | null;
    neverFail: boolean;
}

export const VALID_TOOLS = [
    'cargo',
    'criterion',
    'go',
    'gotpc',
    'benchmarkjs',
    'benchmarkluau',
    'pytest',
    'googlecpp',
    'catch2',
    'julia',
    'jmh',
    'benchmarkdotnet',
    'time',
    'customBiggerIsBetter',
    'customSmallerIsBetter',
    'nyrkioJson',
] as const;
const RE_UINT = /^\d+$/;
const RE_DOUBLE = /^\d+\.\d+$/;

function throwValidationError(neverFail: boolean, msg: string): boolean {
    if (neverFail) {
        console.error(msg);
        console.error('never-fail is set. Will exit cleanly so as not to fail your build.');
        return true;
    }
    throw new Error(msg);
}

function validateToolType(tool: string, neverFail: boolean): asserts tool is ToolType {
    if ((VALID_TOOLS as ReadonlyArray<string>).includes(tool)) {
        return;
    }
    throwValidationError(neverFail, `Invalid value '${tool}' for 'tool' input. It must be one of ${VALID_TOOLS}`);
}

function resolvePath(p: string, neverFail: boolean): string {
    if (p.startsWith('~')) {
        const home = os.homedir();
        if (!home) {
            throwValidationError(neverFail, `Cannot resolve '~' in ${p}`);
            return '';
        }
        p = path.join(home, p.slice(1));
    }
    return path.resolve(p);
}

async function resolveFilePath(p: string, tool: ToolType, neverFail: boolean): Promise<string> {
    p = resolvePath(p, neverFail);

    let s;
    try {
        s = await fs.stat(p);
    } catch (e) {
        throwValidationError(neverFail, `Cannot stat '${p}': ${e}`);
        return '';
    }

    if (tool === 'nyrkioJson') {
        if (!s?.isDirectory()) {
            throwValidationError(
                neverFail,
                `Specified path '${p}' is not a directory. nyrkioJson format expects a directory with one or more JSON files.`,
            );
            return '';
        }
    } else {
        if (!s?.isFile()) {
            throwValidationError(neverFail, `Specified path '${p}' is not a file`);
            return '';
        }
    }

    return p;
}

async function validateOutputFilePath(filePath: string, tool: ToolType, neverFail: boolean): Promise<string> {
    try {
        return await resolveFilePath(filePath, tool, neverFail);
    } catch (err) {
        throwValidationError(neverFail, `Invalid value for 'output-file-path' input: ${err}`);
        return '';
    }
}

function validateGhPagesBranch(branch: string, neverFail: boolean) {
    if (branch) {
        return;
    }
    throwValidationError(neverFail, `Branch value must not be empty for 'gh-pages-branch' input`);
    return;
}

function validateBenchmarkDataDirPath(dirPath: string, neverFail: boolean): string {
    try {
        return resolvePath(dirPath, neverFail);
    } catch (e) {
        throwValidationError(neverFail, `Invalid value for 'benchmark-data-dir-path': ${e}`);
        return '';
    }
}

function validateName(name: string, neverFail: boolean) {
    if (name) {
        return;
    }
    throwValidationError(neverFail, 'Name must not be empty');
    return;
}

function validateGitHubToken(inputName: string, githubToken: string | undefined, todo: string, neverFail: boolean) {
    if (!githubToken) {
        throwValidationError(
            neverFail,
            `'${inputName}' is enabled but 'github-token' is not set. Please give API token ${todo}`,
        );
        return;
    }
}

function getBoolInput(name: string, defaultValue: boolean, neverFail: boolean): boolean {
    const input = core.getInput(name);
    if (!input) {
        return false;
    }
    if (input !== 'true' && input !== 'false') {
        throwValidationError(neverFail, `'${name}' input must be boolean value 'true' or 'false' but got '${input}'`);
        return false;
    }
    return input === 'true';
    return defaultValue;
}

function getPercentageInput(name: string, neverFail: boolean): number | null {
    const input = core.getInput(name);
    if (!input) {
        return null;
    }
    if (!input.endsWith('%')) {
        throwValidationError(neverFail, `'${name}' input must ends with '%' for percentage value (e.g. '200%')`);
        return null;
    }

    const percentage = parseFloat(input.slice(0, -1)); // Omit '%' at last
    if (isNaN(percentage)) {
        throwValidationError(
            neverFail,
            `Specified value '${input.slice(0, -1)}' in '${name}' input cannot be parsed as float number`,
        );
        return null;
    }

    return percentage / 100;
}

function getCommaSeparatedInput(name: string): string[] {
    const input = core.getInput(name);
    if (!input) {
        return [];
    }
    return input.split(',').map((s) => s.trim());
}

function validateAlertCommentCcUsers(users: string[], neverFail: boolean) {
    for (const u of users) {
        if (!u.startsWith('@')) {
            throwValidationError(
                neverFail,
                `User name in 'alert-comment-cc-users' input must start with '@' but got '${u}'`,
            );
            return;
        }
    }
}

async function isDir(path: string) {
    try {
        const s = await fs.stat(path);
        return s.isDirectory();
    } catch (_) {
        return false;
    }
}

async function validateExternalDataJsonPath(
    path: string | undefined,
    autoPush: boolean,
    neverFail: boolean,
): Promise<string | undefined> {
    if (!path) {
        return Promise.resolve(undefined);
    }
    if (autoPush) {
        throwValidationError(
            neverFail,
            'auto-push must be false when external-data-json-path is set since this action reads/writes the given JSON file and never pushes to remote',
        );
        return;
    }
    try {
        const p = resolvePath(path, neverFail);
        if (await isDir(p)) {
            throwValidationError(neverFail, `Specified path '${p}' must be file but it is actually directory`);
            return;
        }
        return p;
    } catch (err) {
        throwValidationError(neverFail, `Invalid value for 'external-data-json-path' input: ${err}`);
        return;
    }
}

function getUintInput(name: string, neverFail: boolean): number | null {
    const input = core.getInput(name);
    if (!input) {
        return null;
    }
    if (!RE_UINT.test(input)) {
        throwValidationError(neverFail, `'${name}' input must be unsigned integer but got '${input}'`);
        return null;
    }
    const i = parseInt(input, 10);
    if (isNaN(i)) {
        throwValidationError(neverFail, `Unsigned integer value '${input}' in '${name}' input was parsed as NaN`);
        return null;
    }
    return i;
}

function getDoubleInput(name: string, neverFail: boolean): number | null {
    const input = core.getInput(name);
    if (input === undefined || input === null) {
        console.log(`${name} is nullish`);
        return null;
    }
    if (input === '') {
        console.log(`${name} is empty string`);
        return null;
    }
    if (!RE_DOUBLE.test(input)) {
        throwValidationError(neverFail, `'${name}' input must be double but got '${input}'`);
        return null;
    }
    const i = parseFloat(input);
    if (isNaN(i)) {
        throwValidationError(neverFail, `Double value '${input}' in '${name}' input was parsed as NaN`);
        return null;
    }
    return i;
}

function validateMaxItemsInChart(max: number | null, neverFail: boolean) {
    if (max !== null && max <= 0) {
        throwValidationError(neverFail, `'max-items-in-chart' input value must be one or more but got ${max}`);
        return;
    }
}

function validateAlertThreshold(
    alertThreshold: number | null,
    failThreshold: number | null,
    neverFail: boolean,
): asserts alertThreshold {
    if (alertThreshold === null) {
        throwValidationError(neverFail, "'alert-threshold' input must not be empty");
        return;
    }
    if (failThreshold && alertThreshold > failThreshold) {
        throwValidationError(
            neverFail,
            `'alert-threshold' value must be smaller than 'fail-threshold' value but got ${alertThreshold} > ${failThreshold}`,
        );
        return;
    }
}

function validateNyrkio(
    nyrkioEnable: boolean,
    nyrkioToken: string | null,
    nyrkioApiRoot: string | null,
    neverFail: boolean,
): asserts nyrkioToken {
    if (nyrkioEnable) {
        if (!nyrkioToken) {
            throwValidationError(
                neverFail,
                'Please use GitHub secrets to supply a JWT token for ${nyrkioApiRoot}. (https://nyrkio.com/docs/getting-started)',
            );
            return;
        }
        if (!nyrkioApiRoot) {
            throwValidationError(
                neverFail,
                'nyrkio-api-root is required. You probably want https://nyrkio.com/api/v0/',
            );
            return;
        }
    }
}

export async function configFromJobInput(): Promise<Config> {
    const neverFail: boolean = getBoolInput('never-fail', false, true);
    const tool: string = core.getInput('tool');
    let outputFilePath: string = core.getInput('output-file-path', { required: true });
    const ghPagesBranch: string = core.getInput('gh-pages-branch');
    const ghRepository: string = core.getInput('gh-repository');
    let benchmarkDataDirPath: string = core.getInput('benchmark-data-dir-path');
    const name: string = core.getInput('name');
    const githubToken: string | undefined = core.getInput('github-token') || undefined;
    const ref: string | undefined = core.getInput('ref') || undefined;
    const autoPush = getBoolInput('auto-push', false, neverFail);
    const skipFetchGhPages = getBoolInput('skip-fetch-gh-pages', false, neverFail);
    const commentAlways = getBoolInput('comment-always', false, neverFail);
    const summaryAlways = getBoolInput('summary-always', false, neverFail);
    const saveDataFile = getBoolInput('save-data-file', false, neverFail);
    const commentOnAlert = getBoolInput('comment-on-alert', false, neverFail);
    const alertThreshold = getPercentageInput('alert-threshold', neverFail);
    const failOnAlert = getBoolInput('fail-on-alert', false, neverFail);
    const alertCommentCcUsers = getCommaSeparatedInput('alert-comment-cc-users');
    let externalDataJsonPath: undefined | string = core.getInput('external-data-json-path');
    const maxItemsInChart = getUintInput('max-items-in-chart', neverFail);
    let failThreshold = getPercentageInput('fail-threshold', neverFail);

    const nyrkioEnable = getBoolInput('nyrkio-enable', true, neverFail);
    const nyrkioToken: string = core.getInput('nyrkio-token');
    let nyrkioApiRoot: string = core.getInput('nyrkio-api-root') || 'https://nyrkio.com/api/v0/';
    const nyrkioPublic: boolean = getBoolInput('nyrkio-public', false, neverFail);
    const nyrkioOrg: string | undefined = core.getInput('nyrkio-org') || undefined;
    const nyrkioPvalue = getDoubleInput('nyrkio-settings-pvalue', neverFail);
    const nyrkioThreshold = getPercentageInput('nyrkio-settings-threshold', neverFail);

    validateToolType(tool, neverFail);
    outputFilePath = await validateOutputFilePath(outputFilePath, tool, neverFail);
    validateGhPagesBranch(ghPagesBranch, neverFail);
    benchmarkDataDirPath = validateBenchmarkDataDirPath(benchmarkDataDirPath, neverFail);
    validateName(name, neverFail);
    if (autoPush) {
        validateGitHubToken('auto-push', githubToken, 'to push GitHub pages branch to remote', neverFail);
    }
    if (commentAlways && !nyrkioEnable) {
        validateGitHubToken('comment-always', githubToken, 'to send commit comment', neverFail);
    }
    if (commentOnAlert && !nyrkioEnable) {
        validateGitHubToken('comment-on-alert', githubToken, 'to send commit comment on alert', neverFail);
    }
    if (ghRepository) {
        validateGitHubToken('gh-repository', githubToken, 'to clone the repository', neverFail);
    }
    validateAlertThreshold(alertThreshold, failThreshold, neverFail);
    validateAlertCommentCcUsers(alertCommentCcUsers, neverFail);
    externalDataJsonPath = await validateExternalDataJsonPath(externalDataJsonPath, autoPush, neverFail);
    validateMaxItemsInChart(maxItemsInChart, neverFail);
    if (failThreshold === null) {
        failThreshold = alertThreshold;
    }
    validateNyrkio(nyrkioEnable, nyrkioToken, nyrkioApiRoot, neverFail);
    if (!nyrkioApiRoot.endsWith('/')) nyrkioApiRoot = nyrkioApiRoot + '/';

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
        nyrkioEnable,
        nyrkioToken,
        nyrkioApiRoot,
        nyrkioPublic,
        nyrkioOrg,
        nyrkioPvalue,
        nyrkioThreshold,
        neverFail,
    };
}
