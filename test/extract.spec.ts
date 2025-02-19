import * as path from 'path';
import { strict as A } from 'assert';
import { Config, ToolType } from '../src/config';

const dummyWebhookPayload = {
    head_commit: {
        author: null,
        committer: null,
        id: '123456789abcdef',
        message: 'this is dummy',
        timestamp: 'dummy timestamp',
        url: 'https://github.com/dummy/repo',
    },
    repository: {
        full_name: 'repo',
    },
} as { [key: string]: any };
let dummyCommitData = {};
let lastCommitRequestData = { uh: 'ah' };
class DummyGitHub {
    rest = {
        repos: {
            getCommit: (data: any) => {
                lastCommitRequestData = data;
                return {
                    status: 200,
                    data: dummyCommitData,
                };
            },
        },
    };
}
const dummyGitHubContext = {
    payload: dummyWebhookPayload,
    repo: {
        owner: 'dummy',
        repo: 'repo',
    },
    ref: 'abcd1234',
};

jest.mock('@actions/github', () => ({
    get context() {
        return dummyGitHubContext;
    },
    getOctokit() {
        return new DummyGitHub();
    },
}));

import { extractResult as actualExtractResult } from '../src/extract';
async function extractResult(config: Config) {
    const bench = await actualExtractResult(config);
    bench.commit.branch = 'mocked_branch';
    return bench;
}

describe('extractResult()', function () {
    afterAll(function () {
        jest.unmock('@actions/github');
    });

    afterEach(function () {
        dummyGitHubContext.payload = dummyWebhookPayload;
    });

    const normalCases: Array<{
        tool: ToolType;
        file: string;
    }> = [
        {
            tool: 'cargo',
            file: 'cargo_output.txt',
        },
        {
            tool: 'cargo',
            file: 'cargo_output2.txt',
        },
        {
            tool: 'cargo',
            file: 'cargo_output3.txt',
        },
        {
            tool: 'cargo',
            file: 'cargo_output_units.txt',
        },
        {
            tool: 'cargo',
            file: 'criterion_output.txt',
        },
        {
            tool: 'catch2',
            file: 'catch2_output_v2.txt',
        },
        {
            tool: 'catch2',
            file: 'catch2_output_v3.txt',
        },
        {
            tool: 'go',
            file: 'go_output.txt',
        },
        {
            tool: 'go',
            file: 'go_fiber_output.txt',
        },
        {
            tool: 'benchmarkjs',
            file: 'benchmarkjs_output.txt',
        },
        {
            tool: 'benchmarkluau',
            file: 'benchmarkluau_output.txt',
        },
        {
            tool: 'pytest',
            file: 'pytest_output.json',
        },
        {
            tool: 'googlecpp',
            file: 'googlecpp_output.json',
        },
        {
            tool: 'pytest',
            file: 'pytest_several_units.json',
        },
        {
            tool: 'catch2',
            file: 'issue16_output.txt',
        },
        {
            tool: 'julia',
            file: 'julia_output.json',
        },
        {
            tool: 'jmh',
            file: 'jmh_output.json',
        },
        {
            tool: 'jmh',
            file: 'jmh_output_2.json',
        },
        {
            tool: 'benchmarkdotnet',
            file: 'benchmarkdotnet.json',
        },
        {
            tool: 'customBiggerIsBetter',
            file: 'customBiggerIsBetter_output.json',
        },
        {
            tool: 'customSmallerIsBetter',
            file: 'customSmallerIsBetter_output.json',
        },
    ];

    it.each(normalCases)(`extracts benchmark output from $tool - $file`, async function (test) {
        jest.useFakeTimers({
            now: 1712131503296,
        });
        const outputFilePath = path.join(__dirname, 'data', 'extract', test.file);
        const config = {
            tool: test.tool,
            outputFilePath,
        } as Config;
        const bench = await extractResult(config);

        expect(bench).toMatchSnapshot();

        jest.useRealTimers();
    });

    it('raises an error on unexpected tool', async function () {
        const config = {
            tool: 'foo' as any,
            outputFilePath: path.join(__dirname, 'data', 'extract', 'go_output.txt'),
        } as Config;
        await A.rejects(extractResult(config), /^Error: FATAL: Unexpected tool: 'foo'$/);
    });

    it('raises an error when output file is not readable', async function () {
        const config = {
            tool: 'go',
            outputFilePath: 'path/does/not/exist.txt',
        } as Config;
        await A.rejects(extractResult(config));
    });

    it('raises an error when no output found', async function () {
        const config = {
            tool: 'cargo',
            outputFilePath: path.join(__dirname, 'data', 'extract', 'go_output.txt'),
        } as Config;
        await A.rejects(extractResult(config), /^Error: No benchmark result was found in /);
    });

    it.each(['pytest', 'googlecpp', 'jmh', 'customBiggerIsBetter', 'customSmallerIsBetter'] as const)(
        `raises an error when output file is not in JSON with tool '%s'`,
        async function (tool) {
            const file = 'go_output.txt';
            // Note: go_output.txt is not in JSON format!
            const outputFilePath = path.join(__dirname, 'data', 'extract', file);
            const config = { tool, outputFilePath } as Config;
            await A.rejects(extractResult(config), /must be JSON file/);
        },
    );

    it('collects the commit information from pull_request payload as fallback', async function () {
        dummyGitHubContext.payload = {
            pull_request: {
                title: 'this is title',
                html_url: 'https://github.com/dummy/repo/pull/1/commits/abcdef0123456789',
                head: {
                    sha: 'abcdef0123456789',
                    url: 'https://github.com/dummy/repo/pull/1/commits/abcdef0123456789',
                    user: {
                        login: 'user',
                    },
                    repo: {
                        updated_at: 'repo updated at timestamp',
                    },
                },
                base: {
                    repo: 'pr_base_repo',
                },
            },
        };
        const outputFilePath = path.join(__dirname, 'data', 'extract', 'go_output.txt');
        const config = {
            tool: 'go',
            outputFilePath,
        } as Config;
        const { commit } = await extractResult(config);
        const expectedUser = {
            name: 'user',
            username: 'user',
        };
        A.deepEqual(commit.author, expectedUser);
        A.deepEqual(commit.committer, expectedUser);
        A.equal(commit.id, 'abcdef0123456789');
        A.equal(commit.message, 'this is title');
        A.equal(commit.timestamp, 'repo updated at timestamp');
        A.equal(commit.url, 'https://github.com/dummy/repo/pull/1/commits/abcdef0123456789');
    });

    it('collects the commit information from specified ref via REST API as fallback when githubToken and ref provided', async function () {
        dummyGitHubContext.payload = {};
        dummyCommitData = {
            author: {
                login: 'testAuthorLogin',
            },
            committer: {
                login: 'testCommitterLogin',
            },
            commit: {
                author: {
                    name: 'test author',
                    date: 'author updated at timestamp',
                    email: 'author@testdummy.com',
                },
                committer: {
                    name: 'test committer',
                    // We use the `author.date` instead.
                    // date: 'committer updated at timestamp',
                    email: 'committer@testdummy.com',
                },
                message: 'test message',
                repo: 'repo',
                branch: 'mocked_branch',
                url: 'https://github.com/dummy/repo/commit/abcd1234',
            },
            sha: 'abcd1234',
            html_url: 'https://github.com/dummy/repo',
        };
        const outputFilePath = path.join(__dirname, 'data', 'extract', 'go_output.txt');
        const config = {
            tool: 'go',
            outputFilePath,
            githubToken: 'abcd1234',
            ref: 'refs/pull/123/head',
        } as Config;

        const { commit } = await extractResult(config);

        const expectedCommit = {
            id: 'abcd1234',
            message: 'test message',
            timestamp: 'author updated at timestamp',
            url: 'https://github.com/dummy/repo/commit/abcd1234',
            repo: 'repo',
            repoUrl: 'https://github.com/dummy/repo',
            branch: 'mocked_branch',
            author: {
                name: 'test author',
                username: 'testAuthorLogin',
                email: 'author@testdummy.com',
            },
            committer: {
                name: 'test committer',
                username: 'testCommitterLogin',
                email: 'committer@testdummy.com',
            },
        };
        A.deepEqual(lastCommitRequestData, {
            owner: 'dummy',
            repo: 'repo',
            ref: 'refs/pull/123/head',
        });
        A.deepEqual(commit, expectedCommit);
    });

    it('collects the commit information from current head via REST API as fallback when githubToken is provided', async function () {
        dummyGitHubContext.payload = {};
        dummyCommitData = {
            author: {
                login: 'testAuthorLogin',
            },
            committer: {
                login: 'testCommitterLogin',
            },
            commit: {
                author: {
                    name: 'test author',
                    date: 'author updated at timestamp',
                    email: 'author@testdummy.com',
                },
                committer: {
                    name: 'test committer',
                    // We use the `author.date` instead.
                    // date: 'committer updated at timestamp',
                    email: 'committer@testdummy.com',
                },
                message: 'test message',
                url: 'https://github.com/dummy/repo/commit/abcd1234',
            },
            sha: 'abcd1235',
            html_url: 'https://github.com/dummy/repo',
        };
        const outputFilePath = path.join(__dirname, 'data', 'extract', 'go_output.txt');
        const config = {
            tool: 'go',
            outputFilePath,
            githubToken: 'abcd1234',
        } as Config;

        const { commit } = await extractResult(config);

        const expectedCommit = {
            id: 'abcd1235',
            message: 'test message',
            timestamp: 'author updated at timestamp',
            url: 'https://github.com/dummy/repo/commit/abcd1234',
            repo: 'repo',
            repoUrl: 'https://github.com/dummy/repo',
            branch: 'mocked_branch',
            author: {
                name: 'test author',
                username: 'testAuthorLogin',
                email: 'author@testdummy.com',
            },
            committer: {
                name: 'test committer',
                username: 'testCommitterLogin',
                email: 'committer@testdummy.com',
            },
        };
        A.deepEqual(lastCommitRequestData, {
            owner: 'dummy',
            repo: 'repo',
            ref: 'abcd1234',
        });
        A.deepEqual(commit, expectedCommit);
    });

    it('raises an error when commit information is not found in webhook payload and no githubToken is provided', async function () {
        dummyGitHubContext.payload = { foo: 'bar' };
        const outputFilePath = path.join(__dirname, 'data', 'extract', 'go_output.txt');
        const config = {
            tool: 'go',
            outputFilePath,
        } as Config;
        await A.rejects(extractResult(config), /^Error: No commit information is found in payload/);
    });
});
