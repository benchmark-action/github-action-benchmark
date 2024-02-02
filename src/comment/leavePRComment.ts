import * as github from '@actions/github';
import { wrapBodyWithBenchmarkTags } from './benchmarkCommentTags';
import { findExistingPRReviewId } from './findExistingPRReviewId';

export async function leavePRComment(
    repoOwner: string,
    repoName: string,
    pullRequestNumber: number,
    body: string,
    commentId: string,
    token: string,
) {
    const client = github.getOctokit(token);

    const bodyWithTags = wrapBodyWithBenchmarkTags(commentId, body);

    const existingCommentId = await findExistingPRReviewId(repoOwner, repoName, pullRequestNumber, commentId, token);

    if (!existingCommentId) {
        const createReviewResponse = await client.rest.pulls.createReview({
            owner: repoOwner,
            repo: repoName,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            pull_number: pullRequestNumber,
            event: 'COMMENT',
            body: bodyWithTags,
        });

        console.log(
            `Comment was created via ${createReviewResponse.url}. Response:`,
            createReviewResponse.status,
            createReviewResponse.data,
        );

        return createReviewResponse;
    }

    const updateReviewResponse = await client.rest.pulls.updateReview({
        owner: repoOwner,
        repo: repoName,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        pull_number: pullRequestNumber,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        review_id: existingCommentId,
        event: 'COMMENT',
        body: bodyWithTags,
    });

    console.log(
        `Comment was updated via ${updateReviewResponse.url}. Response:`,
        updateReviewResponse.status,
        updateReviewResponse.data,
    );

    return updateReviewResponse;
}
