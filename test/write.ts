import { deepStrictEqual as eq, ok as assertOk } from 'assert';
import * as path from 'path';
import { promises as fs } from 'fs';
import { Config } from '../config';
import { Benchmark } from '../extract';
import { DataJson } from '../write';
import mock = require('mock-require');

const ok: (x: any, msg?: string) => asserts x = assertOk;

class FakedOctokitRepos {
    spyOpts: object[];
    constructor() {
        this.spyOpts = [];
    }
    createCommitComment(opt: object) {
        this.spyOpts.push(opt);
        return Promise.resolve({
            status: 201,
            data: {
                html_url: 'dummy commit url',
            },
        });
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

        const lastUpdate = Date.now() - 1000;
        const prevLastUpdate = Date.now() - 10000;
        const user = {
            email: 'dummy@example.com',
            name: 'User',
            username: 'user',
        };
        const currentCommit = {
            author: user,
            committer: user,
            distinct: false,
            id: 'current commit id',
            message: 'dummy message',
            timestamp: 'dummy stamp',
            tree_id: 'dummy tree id',
            url: 'https://github.com/user/repo/commit/current commit id',
        };
        const prevCommit = {
            author: user,
            committer: user,
            distinct: false,
            id: 'prev commit id',
            message: 'dummy message',
            timestamp: 'dummy stamp',
            tree_id: 'dummy tree id',
            url: 'https://github.com/user/repo/commit/prev commit id',
        };

        const testsOk = [
            {
                what: 'one data',
                config: defaultCfg,
                data: {
                    lastUpdate,
                    repoUrl: 'https://github.com/user/repo',
                    entries: {
                        'Test benchmark': [
                            {
                                commit: prevCommit,
                                date: prevLastUpdate,
                                tool: 'cargo',
                                benches: [
                                    {
                                        name: 'bench_fib_10',
                                        range: '+/- 20',
                                        unit: 'ns/iter',
                                        value: 100,
                                    },
                                ],
                            },
                        ],
                    },
                },
                added: {
                    commit: currentCommit,
                    date: lastUpdate,
                    tool: 'cargo',
                    benches: [
                        {
                            name: 'bench_fib_10',
                            range: '+/- 24',
                            unit: 'ns/iter',
                            value: 135,
                        },
                    ],
                },
            },
        ] as Array<{
            what: string;
            config: Config;
            data: DataJson | null;
            added: Benchmark;
            // TODO: Add alert check
        }>;

        for (const test of testsOk) {
            it(test.what, async function() {
                await fs.writeFile(dataJson, JSON.stringify(test.data), 'utf8');

                await writeBenchmark(test.added, test.config);

                const json: DataJson = JSON.parse(await fs.readFile(dataJson, 'utf8'));

                eq(typeof json.lastUpdate, 'number');
                ok(json.entries[test.config.name]);
                const len = json.entries[test.config.name].length;
                ok(len > 0);
                eq(json.entries[test.config.name][len - 1], test.added);

                if (test.data !== null) {
                    ok(json.lastUpdate > test.data.lastUpdate);
                    eq(json.repoUrl, test.data.repoUrl);
                    for (const name of Object.keys(test.data.entries)) {
                        const entries = test.data.entries[name];
                        if (name === test.config.name) {
                            eq(len, entries.length + 1, name);
                        } else {
                            eq(json.entries[name], entries, name);
                        }
                    }
                }
            });
        }
    });
});
