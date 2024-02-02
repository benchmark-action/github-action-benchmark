import * as github from '@actions/github';
import { benchmarkStartTag } from './benchmarkCommentTags';

export async function findExistingPRReviewId(
    repoOwner: string,
    repoName: string,
    pullRequestNumber: number,
    benchName: string,
    token: string,
) {
    const client = github.getOctokit(token);

    const existingReviewsResponse = await client.rest.pulls.listReviews({
        owner: repoOwner,
        repo: repoName,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        pull_number: pullRequestNumber,
    });

    const existingReview = existingReviewsResponse.data.find((review) =>
        review.body.startsWith(benchmarkStartTag(benchName)),
    );

    return existingReview?.id;
}
