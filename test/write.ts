import { deepStrictEqual as eq, ok as assertOk } from 'assert';
import * as path from 'path';
import { promises as fs } from 'fs';
import { Config } from '../config';
import { Benchmark } from '../extract';
import { DataJson } from '../write';
import mock = require('mock-require');

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
                html_url: 'dummy commit url',
            },
        });
    }
    lastCall(): OctokitOpts {
        ok(this.spyOpts.length > 0);
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

const gitHubContext = {
    payload: {
        repository: {
            full_name: 'user/repo',
            html_url: 'https://github.com/user/repo',
            private: false,
        },
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

mock('@actions/github', {
    context: gitHubContext,
});

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

        afterEach(async function() {
            try {
                await fs.unlink(dataJson);
            } catch (_) {
                // Ignore
            }
        });

        const lastUpdate = Date.now() - 10000;
        const user = {
            email: 'dummy@example.com',
            name: 'User',
            username: 'user',
        };

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

        const testCases: Array<{
            what: string;
            config: Config;
            data: DataJson | null;
            added: Benchmark;
            alert?: string[];
            commitComment?: RegExp | RegExp[];
        }> = [
            {
                what: 'appends new result to existing data',
                config: defaultCfg,
                data: {
                    lastUpdate,
                    repoUrl: 'https://github.com/user/repo',
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
                what: 'creates new data file',
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
                what: 'creates new result entry to existing data file',
                config: defaultCfg,
                data: {
                    lastUpdate,
                    repoUrl: 'https://github.com/user/repo',
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
                what: 'appends new result to existing multiple benchmarks data',
                config: defaultCfg,
                data: {
                    lastUpdate,
                    repoUrl: 'https://github.com/user/repo',
                    entries: {
                        'Test benchmark': [
                            {
                                commit: commit('prev commit id'),
                                date: lastUpdate - 1000,
                                tool: 'cargo',
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
                    tool: 'cargo',
                    benches: [bench('bench_fib_10', 135)],
                },
            },
            {
                what: 'raises an alert when exceeding threshold 2.0',
                config: defaultCfg,
                data: {
                    lastUpdate,
                    repoUrl: 'https://github.com/user/repo',
                    entries: {
                        'Test benchmark': [
                            {
                                commit: commit('prev commit id'),
                                date: lastUpdate - 1000,
                                tool: 'cargo',
                                benches: [bench('bench_fib_10', 100), bench('bench_fib_20', 10000)],
                            },
                        ],
                    },
                },
                added: {
                    commit: commit('current commit id'),
                    date: lastUpdate,
                    tool: 'cargo',
                    benches: [bench('bench_fib_10', 210), bench('bench_fib_20', 25000)], // Exceeds 2.0 threshold
                },
                alert: [
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
                what: 'raises an alert without benchmark name with default benchmark name',
                config: { ...defaultCfg, name: 'Benchmark' },
                data: {
                    lastUpdate,
                    repoUrl: 'https://github.com/user/repo',
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
                alert: [
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
                what: 'raises an alert without CC names',
                config: { ...defaultCfg, alertCommentCcUsers: [] },
                data: {
                    lastUpdate,
                    repoUrl: 'https://github.com/user/repo',
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
                alert: [
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
        ];

        for (const t of testCases) {
            it(t.what, async function() {
                if (t.data !== null) {
                    await fs.writeFile(dataJson, JSON.stringify(t.data), 'utf8');
                }

                let caughtError: Error | null = null;
                try {
                    await writeBenchmark(t.added, t.config);
                } catch (err) {
                    if (!t.alert && t.commitComment) {
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

                if (t.alert) {
                    ok(caughtError);
                    const expected = t.alert.join('\n');
                    eq(expected, caughtError.message);
                }

                if (t.commitComment) {
                    ok(caughtError);
                    // Last line is appended only for failure message
                    const expectedMessage = caughtError.message
                        .split('\n')
                        .slice(0, -1)
                        .join('\n');
                    const opts = fakedRepos.lastCall();
                    eq(opts.owner, 'user');
                    eq(opts.repo, 'repo');
                    eq(opts.commit_sha, 'current commit id');
                    eq(opts.body, expectedMessage);
                    // TODO: Check the body is a correct markdown document by markdown parser
                }
            });
        }
    });
});
