import * as path from 'path';
import { strict as A } from 'assert';
import mock = require('mock-require');
import { BenchmarkResult } from '../src/extract';

mock('@actions/github', {
    context: {
        payload: {
            // eslint-disable-next-line @typescript-eslint/camelcase
            head_commit: 'dummy commit hash',
        },
    },
});

const { extractResult } = require('../src/extract');

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
                    extra: '5000000 times\n8 procs',
                },
                {
                    name: 'BenchmarkFib20',
                    unit: 'ns/op',
                    value: 40537,
                    extra: '30000 times',
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
                    extra: '93 samples',
                },
                {
                    name: 'fib(20)',
                    range: '±0.32%',
                    unit: 'ops/sec',
                    value: 12146,
                    extra: '96 samples',
                },
            ],
        },
        {
            tool: 'pytest',
            expected: [
                {
                    name: 'bench.py::test_fib_10',
                    range: 'stddev: 0.000006175090189861328',
                    unit: 'iter/sec',
                    value: 41513.272817492856,
                    extra: 'mean: 0.00002408868133322941 sec\nrounds: 38523',
                },
                {
                    name: 'bench.py::test_fib_20',
                    range: 'stddev: 0.0001745301654140968',
                    unit: 'iter/sec',
                    value: 335.0049328331567,
                    extra: 'mean: 0.002985030672661863 sec\nrounds: 278',
                },
            ],
        },
        {
            tool: 'googlecpp',
            expected: [
                {
                    extra: 'iterations: 3070566\ncpu: 213.65507206163295 ns\nthreads: 1',
                    name: 'fib_10',
                    unit: 'ns/iter',
                    value: 214.98980114547953,
                },
                {
                    extra: 'iterations: 23968\ncpu: 27364.90320427236 ns\nthreads: 1',
                    name: 'fib_20',
                    unit: 'ns/iter',
                    value: 27455.600415007055,
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

            A.equal(bench.commit, 'dummy commit hash');
            A.ok(bench.date <= Date.now(), bench.date.toString());
            A.equal(bench.tool, test.tool);
            A.deepEqual(bench.benches, test.expected);
        });
    }

    it('raises an error on unexpected tool', async function() {
        const config = {
            tool: 'foo',
            outputFilePath: path.join(__dirname, 'data', 'extract', 'go_output.txt'),
        };
        await A.rejects(() => extractResult(config), /^Error: FATAL: Unexpected tool: 'foo'$/);
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
        await A.rejects(() => extractResult(config), /^Error: No benchmark result was found in /);
    });
});
