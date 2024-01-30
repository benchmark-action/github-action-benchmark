import { Benchmark } from '../extract';
import { DataJson } from './types';
import { getCurrentRepoMetadata } from './getCurrentRepoMetadata';
import * as core from '@actions/core';

export function addBenchmarkToDataJson(
    benchName: string,
    bench: Benchmark,
    data: DataJson,
    maxItems: number | null,
): Benchmark | null {
    const repoMetadata = getCurrentRepoMetadata();
    const htmlUrl = repoMetadata.html_url ?? '';

    let prevBench: Benchmark | null = null;
    data.lastUpdate = Date.now();
    data.repoUrl = htmlUrl;

    // Add benchmark result
    if (data.entries[benchName] === undefined) {
        data.entries[benchName] = [bench];
        core.debug(`No suite was found for benchmark '${benchName}' in existing data. Created`);
    } else {
        const suites = data.entries[benchName];
        // Get last suite which has different commit ID for alert comment
        for (const e of suites.slice().reverse()) {
            if (e.commit.id !== bench.commit.id) {
                prevBench = e;
                break;
            }
        }

        suites.push(bench);

        if (maxItems !== null && suites.length > maxItems) {
            suites.splice(0, suites.length - maxItems);
            core.debug(
                `Number of data items for '${benchName}' was truncated to ${maxItems} due to max-items-in-charts`,
            );
        }
    }

    return prevBench;
}
