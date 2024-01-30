import { Benchmark } from '../extract';
import { Config } from '../config';
import * as git from '../git';
import { writeBenchmarkToGitHubPagesWithRetry } from './writeBenchmarkToGitHubPagesWithRetry';

export async function writeBenchmarkToGitHubPages(bench: Benchmark, config: Config): Promise<Benchmark | null> {
    const { ghPagesBranch, skipFetchGhPages, ghRepository, githubToken } = config;
    if (!ghRepository) {
        if (!skipFetchGhPages) {
            await git.fetch(githubToken, ghPagesBranch);
        }
        await git.cmd([], 'switch', ghPagesBranch);
    }
    try {
        return await writeBenchmarkToGitHubPagesWithRetry(bench, config, 10);
    } finally {
        if (!ghRepository) {
            // `git switch` does not work for backing to detached head
            await git.cmd([], 'checkout', '-');
        }
    }
}
