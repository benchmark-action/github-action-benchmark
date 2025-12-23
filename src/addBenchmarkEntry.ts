import { Benchmark } from './extract';
import * as core from '@actions/core';
import { BenchmarkSuites } from './write';
import { normalizeBenchmark } from './normalizeBenchmark';
import { GitGraphAnalyzer } from './gitGraph';

export function addBenchmarkEntry(
    benchName: string,
    benchEntry: Benchmark,
    entries: BenchmarkSuites,
    maxItems: number | null,
): { prevBench: Benchmark | null; normalizedCurrentBench: Benchmark } {
    let prevBench: Benchmark | null = null;
    let normalizedCurrentBench: Benchmark = benchEntry;
    const gitAnalyzer = new GitGraphAnalyzer();

    // Add benchmark result
    if (entries[benchName] === undefined) {
        entries[benchName] = [benchEntry];
        core.debug(`No suite was found for benchmark '${benchName}' in existing data. Created`);
    } else {
        const suites = entries[benchName];

        // Use git-graph aware logic to find previous benchmark
        const currentBranch = gitAnalyzer.getCurrentBranch();
        core.debug(`Finding previous benchmark for branch: ${currentBranch}`);

        prevBench = gitAnalyzer.findPreviousBenchmark(suites, benchEntry.commit.id, currentBranch);

        if (prevBench) {
            core.debug(`Found previous benchmark: ${prevBench.commit.id}`);
        } else {
            core.debug('No previous benchmark found');
        }

        normalizedCurrentBench = normalizeBenchmark(prevBench, benchEntry);

        // Insert at the correct position based on git ancestry
        const insertionIndex = gitAnalyzer.findInsertionIndex(suites, benchEntry.commit.id);
        core.debug(`Inserting benchmark at index ${insertionIndex} (of ${suites.length} existing entries)`);
        suites.splice(insertionIndex, 0, normalizedCurrentBench);

        if (maxItems !== null && suites.length > maxItems) {
            suites.splice(0, suites.length - maxItems);
            core.debug(
                `Number of data items for '${benchName}' was truncated to ${maxItems} due to max-items-in-charts`,
            );
        }
    }
    return { prevBench, normalizedCurrentBench };
}
