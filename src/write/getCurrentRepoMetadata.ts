import * as github from '@actions/github';
import * as git from '../git';

export function getCurrentRepoMetadata() {
    const { repo, owner } = github.context.repo;
    const serverUrl = git.getServerUrl(github.context.payload.repository?.html_url);
    return {
        name: repo,
        owner: {
            login: owner,
        },
        // eslint-disable-next-line @typescript-eslint/naming-convention
        html_url: `${serverUrl}/${owner}/${repo}`,
    };
}
