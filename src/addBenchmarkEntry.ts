import { Benchmark } from './extract';
import * as core from '@actions/core';
import { BenchmarkSuites } from './write';
import { normalizeBenchmark } from './normalizeBenchmark';

export function addBenchmarkEntry(
    benchName: string,
    benchEntry: Benchmark,
    entries: BenchmarkSuites,
    maxItems: number | null,
): { prevBench: Benchmark | null; normalizedCurrentBench: Benchmark } {
    let prevBench: Benchmark | null = null;
    let normalizedCurrentBench: Benchmark = benchEntry;

    // Add benchmark result
    if (entries[benchName] === undefined) {
        entries[benchName] = [benchEntry];
        core.debug(`No suite was found for benchmark '${benchName}' in existing data. Created`);
    } else {
        const suites = entries[benchName];
        // Get the last suite which has different commit ID for alert comment
        for (const e of [...suites].reverse()) {
            if (e.commit.id !== benchEntry.commit.id) {
                prevBench = e;
                break;
            }
        }

        normalizedCurrentBench = normalizeBenchmark(prevBench, benchEntry);

        suites.push(normalizedCurrentBench);

        if (maxItems !== null && suites.length > maxItems) {
            suites.splice(0, suites.length - maxItems);
            core.debug(
                `Number of data items for '${benchName}' was truncated to ${maxItems} due to max-items-in-charts`,
            );
        }
    }
    return { prevBench, normalizedCurrentBench };
}
