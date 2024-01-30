import { Benchmark } from '../extract';
import { Config } from '../config';
import * as github from '@actions/github';
import * as git from '../git';
import * as io from '@actions/io';
import * as core from '@actions/core';
import path from 'path';
import { loadDataJs, storeDataJs } from './loadData';
import { addBenchmarkToDataJson } from './addBenchmarkToDataJson';
import { addIndexHtmlIfNeeded } from './addIndexHtmlIfNeeded';
import { isRemoteRejectedError } from './isRemoteRejectedError';

export async function writeBenchmarkToGitHubPagesWithRetry(
    bench: Benchmark,
    config: Config,
    retry: number,
): Promise<Benchmark | null> {
    const {
        name,
        tool,
        ghPagesBranch,
        ghRepository,
        benchmarkDataDirPath,
        githubToken,
        autoPush,
        skipFetchGhPages,
        maxItemsInChart,
    } = config;
    const rollbackActions = new Array<() => Promise<void>>();

    // FIXME: This payload is not available on `schedule:` or `workflow_dispatch:` events.
    const isPrivateRepo = github.context.payload.repository?.private ?? false;

    let benchmarkBaseDir = './';
    let extraGitArguments: string[] = [];

    if (githubToken && !skipFetchGhPages && ghRepository) {
        benchmarkBaseDir = './benchmark-data-repository';
        await git.clone(githubToken, ghRepository, benchmarkBaseDir);
        rollbackActions.push(async () => {
            await io.rmRF(benchmarkBaseDir);
        });
        extraGitArguments = [`--work-tree=${benchmarkBaseDir}`, `--git-dir=${benchmarkBaseDir}/.git`];
        await git.checkout(ghPagesBranch, extraGitArguments);
    } else if (!skipFetchGhPages && (!isPrivateRepo || githubToken)) {
        await git.pull(githubToken, ghPagesBranch);
    } else if (isPrivateRepo && !skipFetchGhPages) {
        core.warning(
            "'git pull' was skipped. If you want to ensure GitHub Pages branch is up-to-date " +
                "before generating a commit, please set 'github-token' input to pull GitHub pages branch",
        );
    } else {
        console.warn('NOTHING EXECUTED:', {
            skipFetchGhPages,
            ghRepository,
            isPrivateRepo,
            githubToken: !!githubToken,
        });
    }

    // `benchmarkDataDirPath` is an absolute path at this stage,
    // so we need to convert it to relative to be able to prepend the `benchmarkBaseDir`
    const benchmarkDataRelativeDirPath = path.relative(process.cwd(), benchmarkDataDirPath);
    const benchmarkDataDirFullPath = path.join(benchmarkBaseDir, benchmarkDataRelativeDirPath);

    const dataPath = path.join(benchmarkDataDirFullPath, 'data.js');

    await io.mkdirP(benchmarkDataDirFullPath);

    const data = await loadDataJs(dataPath);
    const prevBench = addBenchmarkToDataJson(name, bench, data, maxItemsInChart);

    await storeDataJs(dataPath, data);

    await git.cmd(extraGitArguments, 'add', path.join(benchmarkDataRelativeDirPath, 'data.js'));
    await addIndexHtmlIfNeeded(extraGitArguments, benchmarkDataRelativeDirPath, benchmarkBaseDir);
    await git.cmd(extraGitArguments, 'commit', '-m', `add ${name} (${tool}) benchmark result for ${bench.commit.id}`);

    if (githubToken && autoPush) {
        try {
            await git.push(githubToken, ghRepository, ghPagesBranch, extraGitArguments);
            console.log(
                `Automatically pushed the generated commit to ${ghPagesBranch} branch since 'auto-push' is set to true`,
            );
        } catch (err: any) {
            if (!isRemoteRejectedError(err)) {
                throw err;
            }
            // Fall through

            core.warning(`Auto-push failed because the remote ${ghPagesBranch} was updated after git pull`);

            if (retry > 0) {
                core.debug('Rollback the auto-generated commit before retry');
                await git.cmd(extraGitArguments, 'reset', '--hard', 'HEAD~1');

                // we need to rollback actions in order so not running them concurrently
                for (const action of rollbackActions) {
                    await action();
                }

                core.warning(
                    `Retrying to generate a commit and push to remote ${ghPagesBranch} with retry count ${retry}...`,
                );
                return await writeBenchmarkToGitHubPagesWithRetry(bench, config, retry - 1); // Recursively retry
            } else {
                core.warning(`Failed to add benchmark data to '${name}' data: ${JSON.stringify(bench)}`);
                throw new Error(
                    `Auto-push failed 3 times since the remote branch ${ghPagesBranch} rejected pushing all the time. Last exception was: ${err.message}`,
                );
            }
        }
    } else {
        core.debug(
            `Auto-push to ${ghPagesBranch} is skipped because it requires both 'github-token' and 'auto-push' inputs`,
        );
    }

    return prevBench;
}
