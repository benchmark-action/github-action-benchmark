import { deepStrictEqual as eq, ok as assertOk } from 'assert';
import * as path from 'path';
import { promises as fs } from 'fs';
import * as cheerio from 'cheerio';
import markdownit = require('markdown-it');
import mock = require('mock-require');
import { Config } from '../config';
import { Benchmark } from '../extract';
import { DataJson } from '../write';

const ok: (x: any, msg?: string) => asserts x = assertOk;

type OctokitOpts = { owner: string; repo: string; commit_sha: string; body: string };
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

const fakedRepos = new FakedOctokitRepos();

class FakedOctokit {
    repos: FakedOctokitRepos;
    constructor(public opt: object) {
        this.opt = opt;
        this.repos = fakedRepos;
    }
}

interface RepositoryPayload {
    owner: {
        login: string;
    };
    name: string;
    full_name: string;
    html_url: string;
    private: boolean;
}

const gitHubContext = {
    payload: {
        repository: {
            owner: {
                login: 'user',
            },
            name: 'repo',
            full_name: 'user/repo',
            html_url: 'https://github.com/user/repo',
            private: false,
        } as RepositoryPayload | null,
    },
    workflow: 'Workflow name',
};

mock('@actions/core', {
    debug: () => {
        /* do nothing */
    },
    warning: () => {
        /* do nothing */
    },
});
mock('@actions/github', { context: gitHubContext });
mock('@octokit/rest', FakedOctokit);

const writeBenchmark: (b: Benchmark, c: Config) => Promise<any> = require('../write').writeBenchmark;

describe('writeBenchmark()', function() {
    const savedCwd = process.cwd();

    before(function() {
        process.chdir(path.join(__dirname, 'data', 'write'));
    });

    after(function() {
        mock.stop('@actions/core');
        mock.stop('@actions/github');
        mock.stop('@octokit/rest');
        process.chdir(savedCwd);
    });

    afterEach(function() {
        fakedRepos.clear();
    });

    context('with external json file', function() {
        const dataJson = 'data.json';
        const defaultCfg: Config = {
            name: 'Test benchmark',
            tool: 'cargo',
            outputFilePath: 'dummy', // Should not affect
            ghPagesBranch: 'dummy', // Should not affect
            benchmarkDataDirPath: 'dummy', // Should not affect
            githubToken: undefined,
            autoPush: false,
            skipFetchGhPages: false, // Should not affect
            commentOnAlert: false,
            alertThreshold: 2.0,
            failOnAlert: true,
            alertCommentCcUsers: ['@user'],
            externalDataJsonPath: dataJson,
        };

        const savedRepository = gitHubContext.payload.repository;

        afterEach(async function() {
            try {
                await fs.unlink(dataJson);
            } catch (_) {
                // Ignore
            }
            gitHubContext.payload.repository = savedRepository;
        });

        const lastUpdate = Date.now() - 10000;
        const user = {
            email: 'dummy@example.com',
            name: 'User',
            username: 'user',
        };
        const repoUrl = 'https://github.com/user/repo';
        const md2html = markdownit();

        function commit(id = 'commit id', message = 'dummy message', u = user) {
            return {
                author: u,
                committer: u,
                distinct: false,
                id,
                message,
                timestamp: 'dummy stamp',
                tree_id: 'dummy tree id',
                url: 'https://github.com/user/repo/commit/' + id,
            };
        }

        function bench(name: string, value: number, range = '+/- 20', unit = 'ns/iter') {
            return {
                name,
                range,
                unit,
                value,
            };
        }

        const normalCases: Array<{
            it: string;
            config: Config;
            data: DataJson | null;
            added: Benchmark;
            error?: string[];
            commitComment?: string;
            repoPayload?: null | RepositoryPayload;
        }> = [
            {
                it: 'appends new result to existing data',
                config: defaultCfg,
                data: {
                    lastUpdate,
                    repoUrl,
                    entries: {
                        'Test benchmark': [
                            {
                                commit: commit('prev commit id'),
                                date: lastUpdate - 1000,
                                tool: 'cargo',
                                benches: [bench('bench_fib_10', 100)],
                            },
                        ],
                    },
                },
                added: {
                    commit: commit('current commit id'),
                    date: lastUpdate,
                    tool: 'cargo',
                    benches: [bench('bench_fib_10', 135)],
                },
            },
            {
                it: 'creates new data file',
                config: defaultCfg,
                data: null,
                added: {
                    commit: commit('current commit id'),
                    date: lastUpdate,
                    tool: 'cargo',
                    benches: [bench('bench_fib_10', 135)],
                },
            },
            {
                it: 'creates new result entry to existing data file',
                config: defaultCfg,
                data: {
                    lastUpdate,
                    repoUrl,
                    entries: {
                        'Other benchmark': [
                            {
                                commit: commit('prev commit id'),
                                date: lastUpdate - 1000,
                                tool: 'cargo',
                                benches: [bench('bench_fib_10', 10)],
                            },
                        ],
                    },
                },
                added: {
                    commit: commit('current commit id'),
                    date: lastUpdate,
                    tool: 'cargo',
                    benches: [bench('bench_fib_10', 135)],
                },
            },
            {
                it: 'appends new result to existing multiple benchmarks data',
                config: defaultCfg,
                data: {
                    lastUpdate,
                    repoUrl,
                    entries: {
                        'Test benchmark': [
                            {
                                commit: commit('prev commit id'),
                                date: lastUpdate - 1000,
                                tool: 'pytest',
                                benches: [bench('bench_fib_10', 100)],
                            },
                        ],
                        'Other benchmark': [
                            {
                                commit: commit('prev commit id'),
                                date: lastUpdate - 1000,
                                tool: 'cargo',
                                benches: [bench('bench_fib_10', 10)],
                            },
                        ],
                    },
                },
                added: {
                    commit: commit('current commit id'),
                    date: lastUpdate,
                    tool: 'pytest',
                    benches: [bench('bench_fib_10', 135)],
                },
            },
            {
                it: 'raises an alert when exceeding threshold 2.0',
                config: defaultCfg,
                data: {
                    lastUpdate,
                    repoUrl,
                    entries: {
                        'Test benchmark': [
                            {
                                commit: commit('prev commit id'),
                                date: lastUpdate - 1000,
                                tool: 'go',
                                benches: [bench('bench_fib_10', 100), bench('bench_fib_20', 10000)],
                            },
                        ],
                    },
                },
                added: {
                    commit: commit('current commit id'),
                    date: lastUpdate,
                    tool: 'go',
                    benches: [bench('bench_fib_10', 210), bench('bench_fib_20', 25000)], // Exceeds 2.0 threshold
                },
                error: [
                    '# :warning: **Performance Alert** :warning:',
                    '',
                    "Possible performance regression was detected for benchmark **'Test benchmark'**.",
                    'Benchmark result of this commit is worse than the previous benchmark result exceeding threshold `2`.',
                    '',
                    '| Benchmark suite | Current: current commit id | Previous: prev commit id | Ratio |',
                    '|-|-|-|-|',
                    '| `bench_fib_10` | `210` ns/iter (`+/- 20`) | `100` ns/iter (`+/- 20`) | `2.1` |',
                    '| `bench_fib_20` | `25000` ns/iter (`+/- 20`) | `10000` ns/iter (`+/- 20`) | `2.5` |',
                    '',
                    'This comment was automatically generated by [workflow](https://github.com/user/repo/actions?query=workflow%3AWorkflow%20name) using [github-action-benchmark](https://github.com/rhysd/github-action-benchmark).',
                    '',
                    'CC: @user',
                ],
            },
            {
                it: 'raises an alert with tool whose result value is bigger-is-better',
                config: defaultCfg,
                data: {
                    lastUpdate,
                    repoUrl,
                    entries: {
                        'Test benchmark': [
                            {
                                commit: commit('prev commit id'),
                                date: lastUpdate - 1000,
                                tool: 'benchmarkjs',
                                benches: [bench('benchFib10', 100, '+-20', 'ops/sec')],
                            },
                        ],
                    },
                },
                added: {
                    commit: commit('current commit id'),
                    date: lastUpdate,
                    tool: 'benchmarkjs',
                    benches: [bench('benchFib10', 20, '+-20', 'ops/sec')], // ops/sec so bigger is better
                },
                error: [
                    '# :warning: **Performance Alert** :warning:',
                    '',
                    "Possible performance regression was detected for benchmark **'Test benchmark'**.",
                    'Benchmark result of this commit is worse than the previous benchmark result exceeding threshold `2`.',
                    '',
                    '| Benchmark suite | Current: current commit id | Previous: prev commit id | Ratio |',
                    '|-|-|-|-|',
                    '| `benchFib10` | `20` ops/sec (`+-20`) | `100` ops/sec (`+-20`) | `5` |',
                    '',
                    'This comment was automatically generated by [workflow](https://github.com/user/repo/actions?query=workflow%3AWorkflow%20name) using [github-action-benchmark](https://github.com/rhysd/github-action-benchmark).',
                    '',
                    'CC: @user',
                ],
            },
            {
                it: 'raises an alert without benchmark name with default benchmark name',
                config: { ...defaultCfg, name: 'Benchmark' },
                data: {
                    lastUpdate,
                    repoUrl,
                    entries: {
                        Benchmark: [
                            {
                                commit: commit('prev commit id'),
                                date: lastUpdate - 1000,
                                tool: 'cargo',
                                benches: [bench('bench_fib_10', 100)],
                            },
                        ],
                    },
                },
                added: {
                    commit: commit('current commit id'),
                    date: lastUpdate,
                    tool: 'cargo',
                    benches: [bench('bench_fib_10', 210)], // Exceeds 2.0 threshold
                },
                error: [
                    '# :warning: **Performance Alert** :warning:',
                    '',
                    'Possible performance regression was detected for benchmark.',
                    'Benchmark result of this commit is worse than the previous benchmark result exceeding threshold `2`.',
                    '',
                    '| Benchmark suite | Current: current commit id | Previous: prev commit id | Ratio |',
                    '|-|-|-|-|',
                    '| `bench_fib_10` | `210` ns/iter (`+/- 20`) | `100` ns/iter (`+/- 20`) | `2.1` |',
                    '',
                    'This comment was automatically generated by [workflow](https://github.com/user/repo/actions?query=workflow%3AWorkflow%20name) using [github-action-benchmark](https://github.com/rhysd/github-action-benchmark).',
                    '',
                    'CC: @user',
                ],
            },
            {
                it: 'raises an alert without CC names',
                config: { ...defaultCfg, alertCommentCcUsers: [] },
                data: {
                    lastUpdate,
                    repoUrl,
                    entries: {
                        'Test benchmark': [
                            {
                                commit: commit('prev commit id'),
                                date: lastUpdate - 1000,
                                tool: 'cargo',
                                benches: [bench('bench_fib_10', 100)],
                            },
                        ],
                    },
                },
                added: {
                    commit: commit('current commit id'),
                    date: lastUpdate,
                    tool: 'cargo',
                    benches: [bench('bench_fib_10', 210)], // Exceeds 2.0 threshold
                },
                error: [
                    '# :warning: **Performance Alert** :warning:',
                    '',
                    "Possible performance regression was detected for benchmark **'Test benchmark'**.",
                    'Benchmark result of this commit is worse than the previous benchmark result exceeding threshold `2`.',
                    '',
                    '| Benchmark suite | Current: current commit id | Previous: prev commit id | Ratio |',
                    '|-|-|-|-|',
                    '| `bench_fib_10` | `210` ns/iter (`+/- 20`) | `100` ns/iter (`+/- 20`) | `2.1` |',
                    '',
                    'This comment was automatically generated by [workflow](https://github.com/user/repo/actions?query=workflow%3AWorkflow%20name) using [github-action-benchmark](https://github.com/rhysd/github-action-benchmark).',
                ],
            },
            {
                it: 'sends commit comment on alert with GitHub API',
                config: { ...defaultCfg, commentOnAlert: true, githubToken: 'dummy token' },
                data: {
                    lastUpdate,
                    repoUrl,
                    entries: {
                        'Test benchmark': [
                            {
                                commit: commit('prev commit id'),
                                date: lastUpdate - 1000,
                                tool: 'cargo',
                                benches: [bench('bench_fib_10', 100)],
                            },
                        ],
                    },
                },
                added: {
                    commit: commit('current commit id'),
                    date: lastUpdate,
                    tool: 'cargo',
                    benches: [bench('bench_fib_10', 210)], // Exceeds 2.0 threshold
                },
                commitComment: 'Comment was generated at https://dummy-comment-url',
            },
            {
                it: 'does not raise an alert when both comment-on-alert and fail-on-alert are disabled',
                config: { ...defaultCfg, commentOnAlert: false, failOnAlert: false },
                data: {
                    lastUpdate,
                    repoUrl,
                    entries: {
                        'Test benchmark': [
                            {
                                commit: commit('prev commit id'),
                                date: lastUpdate - 1000,
                                tool: 'cargo',
                                benches: [bench('bench_fib_10', 100)],
                            },
                        ],
                    },
                },
                added: {
                    commit: commit('current commit id'),
                    date: lastUpdate,
                    tool: 'cargo',
                    benches: [bench('bench_fib_10', 210)], // Exceeds 2.0 threshold
                },
                error: undefined,
                commitComment: undefined,
            },
            {
                it: 'ignores other bench case on detecting alerts',
                config: defaultCfg,
                data: {
                    lastUpdate,
                    repoUrl,
                    entries: {
                        'Test benchmark': [
                            {
                                commit: commit('prev commit id'),
                                date: lastUpdate - 1000,
                                tool: 'cargo',
                                benches: [bench('another_bench', 100)],
                            },
                        ],
                    },
                },
                added: {
                    commit: commit('current commit id'),
                    date: lastUpdate,
                    tool: 'cargo',
                    benches: [bench('bench_fib_10', 210)], // Exceeds 2.0 threshold
                },
                error: undefined,
                commitComment: undefined,
            },
            {
                it:
                    'throws an error when GitHub token is not set (though this case should not happen in favor of validation)',
                config: { ...defaultCfg, commentOnAlert: true },
                data: {
                    lastUpdate,
                    repoUrl,
                    entries: {
                        'Test benchmark': [
                            {
                                commit: commit('prev commit id'),
                                date: lastUpdate - 1000,
                                tool: 'cargo',
                                benches: [bench('bench_fib_10', 100)],
                            },
                        ],
                    },
                },
                added: {
                    commit: commit('current commit id'),
                    date: lastUpdate,
                    tool: 'cargo',
                    benches: [bench('bench_fib_10', 210)], // Exceeds 2.0 threshold
                },
                error: ["'comment-on-alert' input is set but 'github-token' input is not set"],
                commitComment: undefined,
            },
            {
                it: 'throws an error when repository payload cannot be obtained from context',
                config: defaultCfg,
                data: {
                    lastUpdate,
                    repoUrl: '', // When repository is null repoUrl will be empty
                    entries: {
                        'Test benchmark': [
                            {
                                commit: commit('prev commit id'),
                                date: lastUpdate - 1000,
                                tool: 'cargo',
                                benches: [bench('bench_fib_10', 100)],
                            },
                        ],
                    },
                },
                added: {
                    commit: commit('current commit id'),
                    date: lastUpdate,
                    tool: 'cargo',
                    benches: [bench('bench_fib_10', 210)], // Exceeds 2.0 threshold
                },
                repoPayload: null,
                error: ['Repository information is not available in payload: {', '  "repository": null', '}'],
            },
        ];

        for (const t of normalCases) {
            it(t.it, async function() {
                if (t.repoPayload !== undefined) {
                    gitHubContext.payload.repository = t.repoPayload;
                }
                if (t.data !== null) {
                    await fs.writeFile(dataJson, JSON.stringify(t.data), 'utf8');
                }

                let caughtError: Error | null = null;
                try {
                    await writeBenchmark(t.added, t.config);
                } catch (err) {
                    if (!t.error && !t.commitComment) {
                        throw err;
                    }
                    caughtError = err;
                }

                const json: DataJson = JSON.parse(await fs.readFile(dataJson, 'utf8'));

                eq(typeof json.lastUpdate, 'number');
                ok(json.entries[t.config.name]);
                const len = json.entries[t.config.name].length;
                ok(len > 0);
                eq(json.entries[t.config.name][len - 1], t.added);

                if (t.data !== null) {
                    ok(json.lastUpdate > t.data.lastUpdate);
                    eq(json.repoUrl, t.data.repoUrl);
                    for (const name of Object.keys(t.data.entries)) {
                        const entries = t.data.entries[name];
                        if (name === t.config.name) {
                            eq(len, entries.length + 1, name);
                            // Check benchmark data except for the last appended one are not modified
                            eq(json.entries[name].slice(0, -1), entries, name);
                        } else {
                            eq(json.entries[name], entries, name);
                        }
                    }
                }

                if (t.error) {
                    ok(caughtError);
                    const expected = t.error.join('\n');
                    eq(expected, caughtError.message);
                }

                if (t.commitComment !== undefined) {
                    ok(caughtError);
                    // Last line is appended only for failure message
                    const messageLines = caughtError.message.split('\n');
                    ok(messageLines.length > 0);
                    const expectedMessage = messageLines.slice(0, -1).join('\n');
                    ok(
                        fakedRepos.spyOpts.length > 0,
                        `len: ${fakedRepos.spyOpts.length}, caught: ${caughtError.message}`,
                    );
                    const opts = fakedRepos.lastCall();
                    eq(opts.owner, 'user');
                    eq(opts.repo, 'repo');
                    eq(opts.commit_sha, 'current commit id');
                    eq(opts.body, expectedMessage);
                    const commentLine = messageLines[messageLines.length - 1];
                    eq(commentLine, t.commitComment);

                    // Check the body is a correct markdown document by markdown parser
                    // Validate markdown content via HTML
                    // TODO: Use Markdown AST instead of DOM API
                    const html = md2html.render(opts.body);
                    const query = cheerio.load(html);

                    const h1 = query('h1');
                    eq(h1.length, 1);
                    eq(h1.text(), ':warning: Performance Alert :warning:');

                    const tr = query('tbody tr');
                    eq(tr.length, t.added.benches.length);

                    const a = query('a');
                    eq(a.length, 2);

                    const workflowLink = a.first();
                    eq(workflowLink.text(), 'workflow');
                    const workflowUrl = workflowLink.attr('href');
                    ok(workflowUrl.startsWith(json.repoUrl), workflowUrl);

                    const actionLink = a.last();
                    eq(actionLink.text(), 'github-action-benchmark');
                    eq(actionLink.attr('href'), 'https://github.com/rhysd/github-action-benchmark');
                }
            });
        }
    });

    // TODO: Add tests for updating GitHub Pages branch
});
