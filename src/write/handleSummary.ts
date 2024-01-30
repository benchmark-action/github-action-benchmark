import { Benchmark } from '../extract';
import { Config } from '../config';
import * as core from '@actions/core';
import { leaveSummary } from './leaveSummary';

export async function handleSummary(benchName: string, currBench: Benchmark, prevBench: Benchmark, config: Config) {
    const { summaryAlways } = config;

    if (!summaryAlways) {
        core.debug('Summary was skipped because summary-always is disabled');
        return;
    }

    await leaveSummary(benchName, currBench, prevBench);
}
