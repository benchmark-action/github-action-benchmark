import { promises as fs } from 'fs';
import yaml from 'js-yaml';
import _ from 'lodash';
import path from 'path';
import * as core from '@actions/core';
import * as github from '@actions/github';
import { extractResult } from './extract';
import { writeBenchmark } from './write';
import { Config } from './config';

async function main() {
    const args = process.argv.slice(2);
    if (args.length !== 2) {
        console.log('Usage: node index_local.ts path/to/config.yml <commit-sha>');
        core.error('Invalid command line parameters!');
        process.exit(1);
    }
    const configFile = args[0];
    const commitSha = args[1];

    let config = await configFromFile(configFile);
    core.debug(`Config loaded from job: ${config}`);

    config = adjustConfigForLocal(config, commitSha);
    github.context.ref = commitSha;
    core.debug(`Config adjusted for local: ${config}`);

    const bench = await extractResult(config);
    core.debug(`Benchmark result was extracted: ${bench}`);

    await writeBenchmark(bench, config, true);
    console.log('github-action-benchmark was run locally successfully!', '\nData:', bench);
}

async function configFromFile(filePath: string) {
    const configString = await fs.readFile(filePath, 'utf8');
    const config = <any>yaml.load(configString);

    return <any>_.mapKeys(config, (_v, k) => _.camelCase(k));
}

function adjustConfigForLocal(config: Config, commitSha: string) {
    // Insert commitSha in outputFilePath
    const configFilePath = path.parse(config.outputFilePath);
    config.outputFilePath = path.resolve(
        configFilePath.dir,
        `${configFilePath.name}-${commitSha}${configFilePath.ext}`,
    );

    // Disarm automations
    config.commentOnAlert = false;

    return config;
}

main().catch((e) => core.setFailed(e.message));
