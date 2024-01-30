import { Benchmark } from './extract';
import { Config } from './config';
import { writeBenchmarkToExternalJson } from './write/writeBenchmarkToExternalJson';
import { writeBenchmarkToGitHubPages } from './write/writeBenchmarkToGitHubPages';
import * as core from '@actions/core';
import { handleComment } from './write/handleComment';
import { handleAlert } from './write/handleAlert';
import { handleSummary } from './write/handleSummary';

export async function writeBenchmark(bench: Benchmark, config: Config) {
    const { name, externalDataJsonPath } = config;
    const prevBench = externalDataJsonPath
        ? await writeBenchmarkToExternalJson(bench, externalDataJsonPath, config)
        : await writeBenchmarkToGitHubPages(bench, config);

    // Put this after `git push` for reducing possibility to get conflict on push. Since sending
    // comment take time due to API call, do it after updating remote branch.
    if (prevBench === null) {
        core.debug('Alert check was skipped because previous benchmark result was not found');
    } else {
        await handleComment(name, bench, prevBench, config);
        await handleAlert(name, bench, prevBench, config);
        await handleSummary(name, bench, prevBench, config);
    }
}
