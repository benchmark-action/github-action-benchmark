import * as core from '@actions/core';
import { configFromJobInput } from './config';
import { extractData, localWriteBenchmark } from './extract';

async function main() {
    const config = await configFromJobInput();
    core.debug(`Config extracted from job: ${config}`);

    const benches = await extractData(config);
    core.debug(`Benchmark result was extracted: ${benches}`);

    await localWriteBenchmark(benches, config);

    console.log('action was run successfully!', '\nData:', benches);
}

main().catch((e) => core.setFailed(e.message));
