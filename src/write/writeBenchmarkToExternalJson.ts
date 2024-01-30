import { Benchmark } from '../extract';
import { Config } from '../config';
import { loadDataJson } from './loadData';
import { addBenchmarkToDataJson } from './addBenchmarkToDataJson';
import * as core from '@actions/core';
import path from 'path';
import * as io from '@actions/io';
import { promises as fs } from 'fs';

export async function writeBenchmarkToExternalJson(
    bench: Benchmark,
    jsonFilePath: string,
    config: Config,
): Promise<Benchmark | null> {
    const { name, maxItemsInChart, saveDataFile } = config;
    const data = await loadDataJson(jsonFilePath);
    const prevBench = addBenchmarkToDataJson(name, bench, data, maxItemsInChart);

    if (!saveDataFile) {
        core.debug('Skipping storing benchmarks in external data file');
        return prevBench;
    }

    try {
        const jsonDirPath = path.dirname(jsonFilePath);
        await io.mkdirP(jsonDirPath);
        await fs.writeFile(jsonFilePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
        throw new Error(`Could not store benchmark data as JSON at ${jsonFilePath}: ${err}`);
    }

    return prevBench;
}
