import { promises as fs } from 'fs';
import * as path from 'path';
import * as io from '@actions/io';
import * as core from '@actions/core';
import git from './git';
import { Benchmark } from './extract';
import { Config } from './config';

type BenchmarkEntries = { [name: string]: Benchmark[] };
interface DataJson {
    lastUpdate: number;
    benches: BenchmarkEntries;
}

async function loadDataJson(jsonPath: string): Promise<DataJson> {
    try {
        const json = await fs.readFile(jsonPath, 'utf8');
        return JSON.parse(json);
    } catch (err) {
        core.debug(`Could not load data.json. Using empty default: ${err}`);
        return {
            lastUpdate: 0,
            benches: {},
        };
    }
}

function addBenchmark(benches: BenchmarkEntries, name: string, bench: Benchmark) {
    if (benches[name] === undefined) {
        benches[name] = [];
    }
    benches[name].push(bench);
}

export async function writeBenchmark(bench: Benchmark, config: Config) {
    const { name, tool, ghPagesBranch, benchmarkDataDirPath } = config;
    const jsonPath = path.join(benchmarkDataDirPath, 'data.json');

    await git('checkout', ghPagesBranch);
    try {
        // Remote may be updated after checkout. Ensure to be able to push
        await git('pull', '--rebase', 'origin', ghPagesBranch);

        await io.mkdirP(benchmarkDataDirPath);

        const data = await loadDataJson(jsonPath);
        data.lastUpdate = Date.now();

        addBenchmark(data.benches, name, bench);

        await fs.writeFile(jsonPath, JSON.stringify(data, null, 2), 'utf8');

        await git('add', jsonPath);

        // TODO: Write default index.html if not found

        await git('commit', '-m', `add ${tool} benchmark result for ${bench.commit}`);

        await git('push', 'origin', ghPagesBranch);
    } finally {
        await git('checkout', '-');
    }
}
