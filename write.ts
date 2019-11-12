import { promises as fs } from 'fs';
import * as path from 'path';
import * as io from '@actions/io';
import * as core from '@actions/core';
import * as github from '@actions/github';
import git from './git';
import { Benchmark } from './extract';
import { Config } from './config';
import { DEFAULT_INDEX_HTML } from './default_index_html';

type BenchmarkEntries = { [name: string]: Benchmark[] };
interface DataJson {
    lastUpdate: number;
    repoUrl: string;
    entries: BenchmarkEntries;
}

const SCRIPT_PREFIX = 'window.BENCHMARK_DATA = ';

async function loadDataJson(dataPath: string): Promise<DataJson> {
    try {
        const script = await fs.readFile(dataPath, 'utf8');
        const json = script.slice(SCRIPT_PREFIX.length);
        const parsed = JSON.parse(json);
        core.debug(`Loaded data.js at ${dataPath}`);
        return parsed;
    } catch (err) {
        console.log(`Could not find data.js at ${dataPath}. Using empty default: ${err}`);
        return {
            lastUpdate: 0,
            repoUrl: '',
            entries: {},
        };
    }
}

async function storeDataJson(dataPath: string, data: DataJson) {
    const script = SCRIPT_PREFIX + JSON.stringify(data, null, 2);
    await fs.writeFile(dataPath, script, 'utf8');
    core.debug(`Overwrote ${dataPath} for adding new data`);
}

function addBenchmark(entries: BenchmarkEntries, name: string, bench: Benchmark) {
    if (entries[name] === undefined) {
        entries[name] = [];
        core.debug(`No entry found for benchmark '${name}'. Created.`);
    }
    entries[name].push(bench);
}

async function addIndexHtmlIfNeeded(dir: string) {
    const indexHtml = path.join(dir, 'index.html');
    try {
        await fs.stat(indexHtml);
        core.debug(`Skipped to create default index.html since it is already existing: ${indexHtml}`);
        return;
    } catch (_) {
        // Continue
    }

    await fs.writeFile(indexHtml, DEFAULT_INDEX_HTML, 'utf8');
    await git('add', indexHtml);
    console.log('Created default index.html at', indexHtml);
}

export async function writeBenchmark(bench: Benchmark, config: Config) {
    const { name, tool, ghPagesBranch, benchmarkDataDirPath } = config;
    const dataPath = path.join(benchmarkDataDirPath, 'data.js');

    /* eslint-disable @typescript-eslint/camelcase */
    const htmlUrl = github.context.payload.repository?.html_url ?? '';
    /* eslint-enable @typescript-eslint/camelcase */

    await git('switch', ghPagesBranch);
    try {
        await io.mkdirP(benchmarkDataDirPath);

        const data = await loadDataJson(dataPath);
        data.lastUpdate = Date.now();
        data.repoUrl = htmlUrl;

        addBenchmark(data.entries, name, bench);

        await storeDataJson(dataPath, data);

        await git('add', dataPath);

        await addIndexHtmlIfNeeded(benchmarkDataDirPath);

        await git(
            '-c',
            'user.name=github-action-benchmark',
            '-c',
            'user.email=github@users.noreply.github.com',
            'commit',
            '-m',
            `add ${name} (${tool}) benchmark result for ${bench.commit.id}`,
        );
    } finally {
        // `git switch` does not work for backing to detached head
        await git('checkout', '-');
    }
}
