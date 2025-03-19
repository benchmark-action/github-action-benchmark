import * as core from '@actions/core';
import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';

export type ToolType = typeof VALID_TOOLS[number];
export interface Config {
    name: string;
    platform: string;
    tool: ToolType;
    outputFilePath: string;
    jsonOutPath: string;
}

export const VALID_TOOLS = ['cargo'] as const;

function validateToolType(tool: string): asserts tool is ToolType {
    if ((VALID_TOOLS as ReadonlyArray<string>).includes(tool)) {
        return;
    }
    throw new Error(`Invalid value '${tool}' for 'tool' input. It must be one of ${VALID_TOOLS}`);
}

function resolvePath(p: string): string {
    if (p.startsWith('~')) {
        const home = os.homedir();
        if (!home) {
            throw new Error(`Cannot resolve '~' in ${p}`);
        }
        p = path.join(home, p.slice(1));
    }
    return path.resolve(p);
}

async function resolveFilePath(p: string): Promise<string> {
    p = resolvePath(p);

    let s;
    try {
        s = await fs.stat(p);
    } catch (e) {
        throw new Error(`Cannot stat '${p}': ${e}`);
    }

    if (!s.isFile()) {
        throw new Error(`Specified path '${p}' is not a file`);
    }

    return p;
}

async function validateOutputFilePath(filePath: string): Promise<string> {
    try {
        return await resolveFilePath(filePath);
    } catch (err) {
        throw new Error(`Invalid value for 'output-file-path' input: ${err}`);
    }
}
async function validateJsonOutPath(filePath: string): Promise<string> {
    try {
	// TODO: validate
	return filePath;
    } catch (err) {
        throw new Error(`Invalid value for 'json-out-path' input: ${err}`);
    }
}

function validateName(name: string) {
    if (name) {
        return;
    }
    throw new Error('Name must not be empty');
}

export async function configFromJobInput(): Promise<Config> {
    const tool: string = core.getInput('tool');
    let outputFilePath: string = core.getInput('output-file-path');
    let jsonOutPath: string = core.getInput('json-out-path');
    const name: string = core.getInput('name');
    const platform: string = core.getInput('platform');

    validateName(name);
    validateToolType(tool);
    outputFilePath = await validateOutputFilePath(outputFilePath);
    jsonOutPath = await validateJsonOutPath(jsonOutPath);

    return {
        name,
        tool,
        outputFilePath,
        jsonOutPath,
        platform,
    };
}
