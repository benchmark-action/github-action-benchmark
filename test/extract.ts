import * as path from 'path';
import * as A from 'assert';
import mock = require('mock-require');
import { BenchmarkResult } from '../extract';

mock('@actions/github', {
    context: {
        payload: {
            head_commit: 'dummy commit hash',
        },
    },
});
mock('@actions/core', {
    debug: () => {
        /* do nothing */
    },
});

const { extractResult } = require('../extract');

describe('extractResult()', function() {
    after(function() {
        mock.stop('@actions/github');
        mock.stop('@actions/core');
    });

    const tests = [
        {
            tool: 'cargo',
            expected: [
                {
                    name: 'bench_fib_10',
                    range: '+/- 24',
                    unit: 'ns/iter',
                    value: 135,
                },
                {
                    name: 'bench_fib_20',
                    range: '+/- 755',
                    unit: 'ns/iter',
                    value: 18149,
                },
            ],
        },
        {
            tool: 'go',
            expected: [
                {
                    name: 'BenchmarkFib10',
                    unit: 'ns/op',
                    value: 325,
                },
                {
                    name: 'BenchmarkFib20',
                    unit: 'ns/op',
                    value: 40537,
                },
            ],
        },
        {
            tool: 'benchmarkjs',
            expected: [
                {
                    name: 'fib(10)',
                    range: '±0.74%',
                    unit: 'ops/sec',
                    value: 1431759,
                },
                {
                    name: 'fib(20)',
                    range: '±0.32%',
                    unit: 'ops/sec',
                    value: 12146,
                },
            ],
        },
    ] as Array<{
        tool: string;
        expected: BenchmarkResult[];
    }>;

    for (const test of tests) {
        it('extracts benchmark output from ' + test.tool, async function() {
            const outputFilePath = path.join(__dirname, 'data', 'extract', `${test.tool}_output.txt`);
            const config = {
                tool: test.tool,
                outputFilePath,
            };
            const bench = await extractResult(config);

            A.strictEqual(bench.commit, 'dummy commit hash');
            A.ok(bench.date <= Date.now(), bench.date.toString());
            A.strictEqual(bench.tool, test.tool);
            A.deepStrictEqual(bench.benches, test.expected);
        });
    }

    it('raises an error on unexpected tool', async function() {
        const config = {
            tool: 'foo',
            outputFilePath: path.join(__dirname, 'data', 'extract', 'go_output.txt'),
        };
        await A.rejects(() => extractResult(config), {
            message: /^FATAL: Unexpected tool: 'foo'$/,
        } as any);
    });

    it('raises an error when output file is not readable', async function() {
        const config = {
            tool: 'go',
            outputFilePath: 'path/does/not/exist.txt',
        };
        await A.rejects(() => extractResult(config));
    });

    it('raises an error when no output found', async function() {
        const config = {
            tool: 'cargo',
            outputFilePath: path.join(__dirname, 'data', 'extract', 'go_output.txt'),
        };
        await A.rejects(() => extractResult(config), {
            message: /^No benchmark result was found in /,
        } as any);
    });
});
