import * as core from '@actions/core';
import { getCurrentRepoMetadata } from './getCurrentRepoMetadata';
import * as github from '@actions/github';

export async function leaveComment(commitId: string, body: string, token: string) {
    core.debug('Sending comment:\n' + body);

    const repoMetadata = getCurrentRepoMetadata();
    const repoUrl = repoMetadata.html_url ?? '';
    const client = github.getOctokit(token);
    const res = await client.rest.repos.createCommitComment({
        owner: repoMetadata.owner.login,
        repo: repoMetadata.name,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        commit_sha: commitId,
        body,
    });

    const commitUrl = `${repoUrl}/commit/${commitId}`;
    console.log(`Comment was sent to ${commitUrl}. Response:`, res.status, res.data);

    return res;
}
