type OctokitOpts = { owner: string; repo: string; commit_sha: string; body: string };
type PullRequestOpts = { owner: string; repo: string; pull_number: number };
type CreateReviewOpts = PullRequestOpts & { event: string; body: string };
class FakedOctokitRepos {
    spyOpts: OctokitOpts[];
    constructor() {
        this.spyOpts = [];
    }
    createCommitComment(opt: OctokitOpts) {
        this.spyOpts.push(opt);
        return Promise.resolve({
            status: 201,
            data: {
                html_url: 'https://dummy-comment-url',
            },
        });
    }
    lastCall(): OctokitOpts {
        return this.spyOpts[this.spyOpts.length - 1];
    }
    clear() {
        this.spyOpts = [];
    }
}

export const fakedRepos = new FakedOctokitRepos();

class FakedOctokitPulls {
    createdReviews: CreateReviewOpts[] = [];

    listReviews() {
        return Promise.resolve({ data: [] });
    }

    createReview(opt: CreateReviewOpts) {
        this.createdReviews.push(opt);
        return Promise.resolve({
            url: 'https://dummy-review-url',
            status: 200,
            data: {
                html_url: 'https://dummy-review-url',
            },
        });
    }

    clear() {
        this.createdReviews = [];
    }
}

export const fakedPulls = new FakedOctokitPulls();

export class FakedOctokit {
    rest = {
        repos: fakedRepos,
        pulls: fakedPulls,
    };
    opt: { token: string };
    constructor(token: string) {
        this.opt = { token };
    }
}
