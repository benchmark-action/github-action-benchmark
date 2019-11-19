import * as core from '@actions/core';
import { promises as fs, Stats } from 'fs';
import * as os from 'os';
import * as path from 'path';

export type ToolType = 'cargo' | 'go' | 'benchmarkjs' | 'pytest';
export interface Config {
    name: string;
    tool: ToolType;
    outputFilePath: string;
    ghPagesBranch: string;
    benchmarkDataDirPath: string;
    githubToken: string | undefined;
    autoPush: boolean;
    skipFetchGhPages: boolean;
    commentOnAlert: boolean;
    alertThreshold: number;
    failOnAlert: boolean;
}

export const VALID_TOOLS: ToolType[] = ['cargo', 'go', 'benchmarkjs', 'pytest'];

function validateToolType(tool: string): asserts tool is ToolType {
    if ((VALID_TOOLS as string[]).includes(tool)) {
        return;
    }
    throw new Error(`Invalid value '${tool}' for 'tool' input. It must be one of ${VALID_TOOLS}`);
}

function resolvePath(p: string): string {
    if (p[0] === '~') {
        const home = os.homedir();
        if (!home) {
            throw new Error("Cannot resolve '~'");
        }
        p = path.join(home, p.slice(1));
    }
    return path.resolve(p);
}

async function statPath(p: string): Promise<[Stats, string]> {
    p = resolvePath(p);
    try {
        return [await fs.stat(p), p];
    } catch (e) {
        throw new Error(`Cannot stat '${p}': ${e}`);
    }
}

async function validateOutputFilePath(filePath: string): Promise<string> {
    try {
        const [stat, resolved] = await statPath(filePath);
        if (!stat.isFile()) {
            throw new Error(`Specified path '${filePath}' is not a file`);
        }
        return resolved;
    } catch (err) {
        throw new Error(`Invalid value for 'output-file-path' input: ${err}`);
    }
}

function validateGhPagesBranch(branch: string) {
    if (branch) {
        return;
    }
    throw new Error(`Branch value must not be empty for 'gh-pages-branch' input`);
}

function validateBenchmarkDataDirPath(dirPath: string): string {
    try {
        return resolvePath(dirPath);
    } catch (e) {
        throw new Error(`Invalid value for 'benchmark-data-dir-path': ${e}`);
    }
}

function validateName(name: string) {
    if (name) {
        return;
    }
    throw new Error('Name must not be empty');
}

function validateGitHubToken(inputName: string, githubToken: string | undefined) {
    if (!githubToken) {
        throw new Error(
            `'${inputName}' is enabled but 'github-token' is not set. Please give API token for pushing GitHub pages branch to remote`,
        );
    }
}

function getBoolInput(name: string): boolean {
    const input = core.getInput(name);
    if (!input) {
        return false;
    }
    if (input !== 'true' && input !== 'false') {
        throw new Error(`'${name}' input must be boolean value 'true' or 'false' but got '${input}'`);
    }
    return input === 'true';
}

function getPercentageInput(name: string): number {
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

export async function configFromJobInput(): Promise<Config> {
    const tool: string = core.getInput('tool');
    let outputFilePath: string = core.getInput('output-file-path');
    const ghPagesBranch: string = core.getInput('gh-pages-branch');
    let benchmarkDataDirPath: string = core.getInput('benchmark-data-dir-path');
    const name: string = core.getInput('name');
    const githubToken: string | undefined = core.getInput('github-token') || undefined;
    const autoPush = getBoolInput('auto-push');
    const skipFetchGhPages = getBoolInput('skip-fetch-gh-pages');
    const commentOnAlert = getBoolInput('comment-on-alert');
    const alertThreshold = getPercentageInput('alert-threshold');
    const failOnAlert = getBoolInput('fail-on-alert');

    validateToolType(tool);
    outputFilePath = await validateOutputFilePath(outputFilePath);
    validateGhPagesBranch(ghPagesBranch);
    benchmarkDataDirPath = validateBenchmarkDataDirPath(benchmarkDataDirPath);
    validateName(name);
    if (autoPush) {
        validateGitHubToken('auto-push', githubToken);
    }
    if (commentOnAlert) {
        validateGitHubToken('comment-on-alert', githubToken);
    }

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
    };
}
