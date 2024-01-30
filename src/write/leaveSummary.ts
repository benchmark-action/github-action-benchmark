import { Benchmark } from '../extract';
import { buildComment } from './buildComment';
import * as core from '@actions/core';

export async function leaveSummary(benchName: string, currBench: Benchmark, prevBench: Benchmark) {
    const body = buildComment(benchName, currBench, prevBench, false);

    const summary = core.summary.addRaw(body);

    core.debug('Writing a summary about benchmark comparison');
    core.debug(summary.stringify());

    await summary.write();
}
