import * as path from 'path';
import { strict as A } from 'assert';
import { Config, ToolType } from '../src/config';
import { BenchmarkResult, extractResult } from '../src/extract';

const dummyWebhookPayload = {
    head_commit: {
        author: null,
        committer: null,
        id: '123456789abcdef',
        message: 'this is dummy',
        timestamp: 'dummy timestamp',
        url: 'https://github.com/dummy/repo',
    },
} as { [key: string]: any };
let dummyCommitData = {};
class DummyGitHub {
    repos = {
        getCommit: () => {
            return {
                status: 200,
                data: dummyCommitData,
            };
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
    get GitHub() {
        return DummyGitHub;
    },
}));

describe('extractResult()', function () {
    afterAll(function () {
        jest.unmock('@actions/github');
    });

    afterEach(function () {
        dummyGitHubContext.payload = dummyWebhookPayload;
    });

    const normalCases: Array<{
        tool: ToolType;
        expected: BenchmarkResult[];
        file?: string;
    }> = [
        {
            tool: 'cargo',
            expected: [
                {
                    name: 'bench_fib_10',
                    range: '± 24',
                    unit: 'ns/iter',
                    value: 135,
                },
                {
                    name: 'bench_fib_20',
                    range: '± 755',
                    unit: 'ns/iter',
                    value: 18149,
                },
            ],
        },
        {
            tool: 'cargo',
            file: 'cargo_output2.txt',
            expected: [
                {
                    name: 'bench_engine_new',
                    range: '± 70126',
                    unit: 'ns/iter',
                    value: 211834,
                },
                {
                    name: 'bench_engine_new_raw',
                    range: '± 18',
                    unit: 'ns/iter',
                    value: 197,
                },
                {
                    name: 'bench_engine_new_raw_core',
                    range: '± 31',
                    unit: 'ns/iter',
                    value: 196,
                },
                {
                    name: 'bench_engine_register_fn',
                    range: '± 82',
                    unit: 'ns/iter',
                    value: 493,
                },
            ],
        },
        {
            tool: 'cargo',
            file: 'criterion_output.txt',
            expected: [
                {
                    name: 'Create Realm',
                    range: '± 4',
                    unit: 'ns/iter',
                    value: 329,
                },
                {
                    name: 'Symbols (Execution)',
                    range: '± 47',
                    unit: 'ns/iter',
                    value: 3268,
                },
                {
                    name: 'For loop (Execution)',
                    range: '± 123',
                    unit: 'ns/iter',
                    value: 12314,
                },
                {
                    name: 'Fibonacci (Execution)',
                    range: '± 10166',
                    unit: 'ns/iter',
                    value: 1672496,
                },
            ],
        },
        {
            tool: 'catch2',
            expected: [
                {
                    name: 'Fibonacci 10',
                    range: '± 19',
                    unit: 'ns',
                    value: 344,
                    extra: '100 samples\n208 iterations',
                },
                {
                    name: 'Fibonacci 20',
                    range: '± 3.256',
                    unit: 'us',
                    value: 41.731,
                    extra: '100 samples\n2 iterations',
                },
                {
                    name: 'Fibonacci~ 5!',
                    range: '± 4',
                    unit: 'ns',
                    value: 36,
                    extra: '100 samples\n1961 iterations',
                },
                {
                    name: 'Fibonacci-15_bench',
                    range: '± 362',
                    unit: 'us',
                    value: 3.789,
                    extra: '100 samples\n20 iterations',
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
                    value: 40537.123,
                    extra: '30000 times',
                },
                {
                    name: 'BenchmarkFib/my_tabled_benchmark_-_10',
                    unit: 'ns/op',
                    value: 325,
                    extra: '5000000 times\n8 procs',
                },
                {
                    name: 'BenchmarkFib/my_tabled_benchmark_-_20',
                    unit: 'ns/op',
                    value: 40537.123,
                    extra: '30000 times',
                },
                {
                    name: 'BenchmarkFib/my/tabled/benchmark_-_20',
                    unit: 'ns/op',
                    value: 40537.456,
                    extra: '30001 times',
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
                {
                    name: 'createObjectBuffer with 200 comments',
                    range: '±1.70%',
                    unit: 'ops/sec',
                    value: 81.61,
                    extra: '69 samples',
                },
            ],
        },
        {
            tool: 'benchmarkluau',
            expected: [
                {
                    name: 'base64',
                    range: '±0.636%',
                    unit: 'ms',
                    value: 15.041,
                    extra: 'luau',
                },
                {
                    name: 'chess',
                    range: '±0.212%',
                    unit: 'ms',
                    value: 69.56,
                    extra: 'luau',
                },
                {
                    name: 'life',
                    range: '±0.187%',
                    unit: 'ms',
                    value: 85.089,
                    extra: 'luau',
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
                    extra: 'mean: 24.08868133322941 usec\nrounds: 38523',
                },
                {
                    name: 'bench.py::test_fib_20',
                    range: 'stddev: 0.0001745301654140968',
                    unit: 'iter/sec',
                    value: 335.0049328331567,
                    extra: 'mean: 2.9850306726618627 msec\nrounds: 278',
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
        {
            tool: 'pytest',
            file: 'pytest_several_units.json',
            expected: [
                {
                    extra: 'mean: 149.95610248628836 nsec\nrounds: 68536',
                    name: 'bench.py::test_fib_1',
                    range: 'stddev: 2.9351731952139377e-8',
                    unit: 'iter/sec',
                    value: 6668618.238403659,
                },
                {
                    name: 'bench.py::test_fib_10',
                    range: 'stddev: 0.000005235937482008476',
                    unit: 'iter/sec',
                    value: 34652.98828915334,
                    extra: 'mean: 28.85754012484424 usec\nrounds: 20025',
                },
                {
                    name: 'bench.py::test_fib_20',
                    range: 'stddev: 0.0003737982822178215',
                    unit: 'iter/sec',
                    value: 276.8613383807958,
                    extra: 'mean: 3.611916368852473 msec\nrounds: 122',
                },
                {
                    extra: 'mean: 2.0038430469999997 sec\nrounds: 5',
                    name: 'bench.py::test_sleep_2',
                    range: 'stddev: 0.0018776587251587858',
                    unit: 'iter/sec',
                    value: 0.49904108083570886,
                },
            ],
        },
        {
            tool: 'catch2',
            file: 'issue16_output.txt',
            expected: [
                {
                    extra: '100 samples\n76353 iterations',
                    name: 'Fibonacci 10',
                    range: '± 0',
                    unit: 'ns',
                    value: 0,
                },
                {
                    extra: '100 samples\n75814 iterations',
                    name: 'Fibonacci 20',
                    range: '± 0',
                    unit: 'ns',
                    value: 1,
                },
            ],
        },
        {
            tool: 'julia',
            file: 'julia_output.json',
            expected: [
                {
                    extra: 'gctime=0\nmemory=0\nallocs=0\nparams={"gctrial":true,"time_tolerance":0.05,"samples":10000,"evals":390,"gcsample":false,"seconds":5,"overhead":0,"memory_tolerance":0.01}',
                    name: 'fib/10',
                    unit: 'ns',
                    value: 246.03846153846155,
                },
                {
                    extra: 'gctime=0\nmemory=0\nallocs=0\nparams={"gctrial":true,"time_tolerance":0.05,"samples":10000,"evals":1,"gcsample":false,"seconds":5,"overhead":0,"memory_tolerance":0.01}',
                    name: 'fib/20',
                    unit: 'ns',
                    value: 31028,
                },
            ],
        },
        {
            tool: 'benchmarkdotnet',
            file: 'benchmarkdotnet.json',
            expected: [
                {
                    name: 'Sample.Benchmarks.Fib10',
                    range: '± 0.1981212530783709',
                    unit: 'ns',
                    value: 24.4202085009643,
                },
                {
                    name: 'Sample.Benchmarks.Fib20',
                    range: '± 0.7903737021529575',
                    unit: 'ns',
                    value: 51.52008151549559,
                },
            ],
        },
        {
            tool: 'customBiggerIsBetter',
            expected: [
                {
                    name: 'My Custom Bigger Is Better Benchmark - Throughput',
                    unit: 'req/s',
                    value: 70,
                    range: undefined,
                    extra: undefined,
                },
                {
                    name: 'My Custom Bigger Is Better Benchmark - Free Memory',
                    unit: 'Megabytes',
                    value: 150,
                    range: '3',
                    extra: 'Optional Value #1: 25\nHelpful Num #2: 100\nAnything Else!',
                },
            ],
        },
        {
            tool: 'customSmallerIsBetter',
            expected: [
                {
                    name: 'My Custom Smaller Is Better Benchmark - CPU Load',
                    unit: 'Percent',
                    value: 50,
                    range: '5%',
                    extra: 'My Optional Information for the tooltip',
                },
                {
                    name: 'My Custom Smaller Is Better Benchmark - Memory Used',
                    unit: 'Megabytes',
                    value: 100,
                    range: undefined,
                    extra: undefined,
                },
            ],
        },
        {
            tool: 'cabal',
            expected: [
                {
                    name: 'fib/1',
                    unit: 'nsec',
                    value: 12.128410840686445,
                    range: '±0.2145268159803889 nsec',
                    extra: 'Mean lower bound: 12.074536540005713 nsec\nMean upper bound: 12.20221697579002 nsec\nStandard deviation LB: 0.16198043933498568 nsec\nStandard deviation UB: 0.27812295435222917 nsec',
                },
                {
                    name: 'fib/5',
                    unit: 'nsec',
                    value: 237.76579995877364,
                    range: '±13.331560091086645 nsec',
                    extra: 'Mean lower bound: 234.3297169016553 nsec\nMean upper bound: 242.62841729253594 nsec\nStandard deviation LB: 9.007202760821372 nsec\nStandard deviation UB: 19.96951369185613 nsec',
                },
            ],
        },
    ];

    for (const test of normalCases) {
        it(`extracts benchmark output from ${test.tool}${test.file ? ` - ${test.file}` : ''}`, async function () {
            const file = test.file ?? `${test.tool}_output.txt`;
            const outputFilePath = path.join(__dirname, 'data', 'extract', file);
            const config = {
                tool: test.tool,
                outputFilePath,
            } as Config;
            const bench = await extractResult(config);

            A.equal(bench.commit, dummyWebhookPayload.head_commit);
            A.ok(bench.date <= Date.now(), bench.date.toString());
            A.equal(bench.tool, test.tool);
            A.deepEqual(test.expected, bench.benches);
        });
    }

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

    const toolSpecificErrorCases: Array<{
        it: string;
        tool: ToolType;
        file: string;
        expected: RegExp;
    }> = [
        ...(['pytest', 'googlecpp', 'customBiggerIsBetter', 'customSmallerIsBetter'] as const).map((tool) => ({
            it: `raises an error when output file is not in JSON with tool '${tool}'`,
            tool,
            file: 'go_output.txt',
            expected: /must be JSON file/,
        })),
    ];

    for (const t of toolSpecificErrorCases) {
        it(t.it, async function () {
            // Note: go_output.txt is not in JSON format!
            const outputFilePath = path.join(__dirname, 'data', 'extract', t.file);
            const config = { tool: t.tool, outputFilePath } as Config;
            await A.rejects(extractResult(config), t.expected);
        });
    }

    it('collects the commit information from pull_request payload as fallback', async function () {
        dummyGitHubContext.payload = {
            pull_request: {
                title: 'this is title',
                html_url: 'https://github.com/dummy/repo/pull/1',
                head: {
                    sha: 'abcdef0123456789',
                    user: {
                        login: 'user',
                    },
                    repo: {
                        updated_at: 'repo updated at timestamp',
                    },
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
            },
            sha: 'abcd1234',
            html_url: 'https://github.com/dymmy/repo/commit/abcd1234',
        };
        const outputFilePath = path.join(__dirname, 'data', 'extract', 'go_output.txt');
        const config = {
            tool: 'go',
            outputFilePath,
            githubToken: 'abcd1234',
        } as Config;

        const { commit } = await extractResult(config);

        const expectedCommit = {
            id: 'abcd1234',
            message: 'test message',
            timestamp: 'author updated at timestamp',
            url: 'https://github.com/dymmy/repo/commit/abcd1234',
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
        A.deepEqual(commit, expectedCommit);
    });

    it('raises an error when commit information is not found in webhook payload and no githubToken is provided', async function () {
        dummyGitHubContext.payload = {};
        const outputFilePath = path.join(__dirname, 'data', 'extract', 'go_output.txt');
        const config = {
            tool: 'go',
            outputFilePath,
        } as Config;
        await A.rejects(extractResult(config), /^Error: No commit information is found in payload/);
    });
});
