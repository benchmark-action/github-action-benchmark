import { DataJson } from './types';
import { promises as fs } from 'fs';
import * as core from '@actions/core';

export const SCRIPT_PREFIX = 'window.BENCHMARK_DATA = ';

const DEFAULT_DATA_JSON = {
    lastUpdate: 0,
    repoUrl: '',
    entries: {},
};

export async function loadDataJs(dataPath: string): Promise<DataJson> {
    try {
        const script = await fs.readFile(dataPath, 'utf8');
        const json = script.slice(SCRIPT_PREFIX.length);
        const parsed = JSON.parse(json);
        core.debug(`Loaded data.js at ${dataPath}`);
        return parsed;
    } catch (err) {
        console.log(`Could not find data.js at ${dataPath}. Using empty default: ${err}`);
        return { ...DEFAULT_DATA_JSON };
    }
}

export async function loadDataJson(jsonPath: string): Promise<DataJson> {
    try {
        const content = await fs.readFile(jsonPath, 'utf8');
        const json: DataJson = JSON.parse(content);
        core.debug(`Loaded external JSON file at ${jsonPath}`);
        return json;
    } catch (err) {
        core.warning(
            `Could not find external JSON file for benchmark data at ${jsonPath}. Using empty default: ${err}`,
        );
        return { ...DEFAULT_DATA_JSON };
    }
}

export async function storeDataJs(dataPath: string, data: DataJson) {
    const script = SCRIPT_PREFIX + JSON.stringify(data, null, 2);
    await fs.writeFile(dataPath, script, 'utf8');
    core.debug(`Overwrote ${dataPath} for adding new data`);
}
