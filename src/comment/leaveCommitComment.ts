import * as github from '@actions/github';
import * as core from '@actions/core';
import { wrapBodyWithBenchmarkTags } from './benchmarkCommentTags';

export async function leaveCommitComment(
    repoOwner: string,
    repoName: string,
    commitId: string,
    body: string,
    commentId: string,
    token: string,
) {
    core.debug('leaveCommitComment start');
    const client = github.getOctokit(token);
    const response = await client.rest.repos.createCommitComment({
        owner: repoOwner,
        repo: repoName,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        commit_sha: commitId,
        body: wrapBodyWithBenchmarkTags(commentId, body),
    });
    console.log(`Comment was sent to ${response.url}. Response:`, response.status, response.data);
    core.debug('leaveCommitComment end');
    return response;
}
