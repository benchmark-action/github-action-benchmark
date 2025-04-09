import * as core from '@actions/core';
import { configFromJobInput } from './config';
import { extractResult, extractNyrkioJsonResult } from './extract';
import { writeBenchmark } from './write';
import { nyrkioFindChanges, postResults } from './nyrkio';

async function main() {
    const config = await configFromJobInput();
    core.debug(`Config extracted from job: ` + JSON.stringify(config));
    core.debug('PWD: ' + process.cwd());
    if (config.tool === 'nyrkioJson') {
        const [nyrkioJsonPath, commit] = await extractNyrkioJsonResult(config);
        await postResults(nyrkioJsonPath, config, commit);
    } else {
        const bench = await extractResult(config);
        const { commit, date, tool, benches } = bench;
        core.debug(`Benchmark result was extracted: ` + JSON.stringify(benches));
        core.debug(`Commit info was extracted: ` + JSON.stringify(commit));
        core.debug(`Time of when this action ran is: ${date}`);
        core.debug(`But timestamp of the commit is: ${commit.timestamp}`);
        core.debug(tool);

        const { nyrkioEnable, ghRepository } = config;
        if (nyrkioEnable) await nyrkioFindChanges(bench, config);

        if (ghRepository) await writeBenchmark(bench, config);
    }
    console.log('the end.');
}

async function maybeSetFailed(e: any) {
    const config = await configFromJobInput();
    const { neverFail } = config;

    if (!neverFail) {
        core.setFailed(e ? e.message : 'e is undefined');
        return false;
    } else {
        console.error(e ? e.message : 'e is undefined');
        console.error('Note: never-fail is true. Will exit successfully to keep the build green.');
        return true;
    }
}

main().catch(async (e) => await maybeSetFailed(e));
