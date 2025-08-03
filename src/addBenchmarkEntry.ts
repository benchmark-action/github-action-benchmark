import { Benchmark } from './extract';
import * as core from '@actions/core';
import { BenchmarkSuites } from './write';

export function addBenchmarkEntry(
    benchName: string,
    benchEntry: Benchmark,
    entries: BenchmarkSuites,
    maxItems: number | null,
): { prevBench: Benchmark | null } {
    let prevBench: Benchmark | null = null;

    // Add benchmark result
    if (entries[benchName] === undefined) {
        entries[benchName] = [benchEntry];
        core.debug(`No suite was found for benchmark '${benchName}' in existing data. Created`);
    } else {
        const suites = entries[benchName];
        // Get last suite which has different commit ID for alert comment
        for (const e of suites.slice().reverse()) {
            if (e.commit.id !== benchEntry.commit.id) {
                prevBench = e;
                break;
            }
        }

        suites.push(benchEntry);

        if (maxItems !== null && suites.length > maxItems) {
            suites.splice(0, suites.length - maxItems);
            core.debug(
                `Number of data items for '${benchName}' was truncated to ${maxItems} due to max-items-in-charts`,
            );
        }
    }
    return { prevBench };
}
