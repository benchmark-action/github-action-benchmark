/* eslint-disable @typescript-eslint/naming-convention */
import { promises as fs } from 'fs';
import * as github from '@actions/github';
import * as git from './git';
import { Config, ToolType } from './config';

export interface BenchmarkResult {
    name: string;
    value: number;
    range?: string;
    unit: string;
    extra?: string;
}

interface GitHubUser {
    email?: string;
    name: string;
    username: string;
}

interface Commit {
    author: GitHubUser;
    committer: GitHubUser;
    distinct?: unknown; // Unused
    id: string;
    message: string;
    timestamp: string;
    tree_id?: unknown; // Unused
    url: string;
}

interface PullRequest {
    [key: string]: any;
    number: number;
    html_url?: string;
    body?: string;
}

export interface Benchmark {
    commit: Commit;
    date: number;
    tool: ToolType;
    benches: BenchmarkResult[];
}

export interface GoogleCppBenchmarkJson {
    context: {
        date: string;
        host_name: string;
        executable: string;
        num_cpus: number;
        mhz_per_cpu: number;
        cpu_scaling_enabled: boolean;
        caches: unknown;
        load_avg: number[];
        library_build_type: 'release' | 'debug';
    };
    benchmarks: Array<{
        name: string;
        run_name: string;
        run_type: string;
        repetitions: number;
        repetition_index: number;
        threads: number;
        iterations: number;
        real_time: number;
        cpu_time: number;
        time_unit: string;
    }>;
}

export interface PytestBenchmarkJson {
    machine_info: {
        node: string;
        processor: string;
        machine: string;
        python_compiler: string;
        python_implementation: string;
        python_implementation_version: string;
        python_version: string;
        python_build: string[];
        release: string;
        system: string;
        cpu: {
            vendor_id: string;
            hardware: string;
            brand: string;
        };
    };
    commit_info: {
        id: string;
        time: string;
        author_time: string;
        dirty: boolean;
        project: string;
        branch: string;
    };
    benchmarks: Array<{
        group: null | string;
        name: string;
        fullname: string;
        params: null | string[];
        param: null | string;
        extra_info: object;
        options: {
            disable_gc: boolean;
            time: string;
            min_rounds: number;
            max_time: number;
            min_time: number;
            warmup: boolean;
        };
        stats: {
            min: number;
            max: number;
            mean: number;
            stddev: number;
            rounds: number;
            median: number;
            irq: number;
            q1: number;
            q3: number;
            irq_outliers: number;
            stddev_outliers: number;
            outliers: string;
            ld15iqr: number;
            hd15iqr: number;
            ops: number;
            total: number;
            data: number[];
            iterations: number;
        };
    }>;
    datetime: string;
    version: string;
}

type JuliaBenchmark = JuliaBenchmarkGroup | JuliaBenchmarkTrialEstimate | JuliaBenchmarkOther;

type JuliaBenchmarkOther = [string, unknown];

type JuliaBenchmarkTrialEstimate = [
    'TrialEstimate',
    {
        params: [
            string,
            {
                seconds: number;
                samples: number;
                evals: number;
                overhead: number;
                gctrial: boolean;
                gcsample: boolean;
                time_tolerance: number;
                memory_tolerance: number;
            },
        ];
        time: number;
        gctime: number;
        memory: number;
        allocs: number;
    },
];

type JuliaBenchmarkGroup = [
    'BenchmarkGroup',
    {
        data: Record<string, JuliaBenchmark>;
        tags: string[];
    },
];

type JuliaBenchmarkJson = [object, JuliaBenchmarkGroup[]];

export interface JmhBenchmarkJson {
    jmhVersion: string;
    benchmark: string;
    mode: string;
    threads: number;
    forks: number;
    jvm: string;
    jvmArgs: string[];
    jdkVersion: string;
    vmName: string;
    vmVersion: string;
    warmupIterations: number;
    warmupTime: string;
    warmupBatchSize: number;
    measurementIterations: number;
    measurementTime: string;
    measurementBatchSize: number;
    primaryMetric: {
        score: number;
        scoreError: number;
        scoreConfidence: number[];
        scorePercentiles: {
            0.0: number;
            50.0: number;
            90.0: number;
            95.0: number;
            99.0: number;
            99.9: number;
            99.99: number;
            99.999: number;
            99.9999: number;
            100.0: number;
        };
        scoreUnit: string;
        rawData: number[][];
    };
}

export interface BenchmarkDotnetBenchmark {
    FullName: string;
    Statistics: {
        StandardDeviation: number;
        Mean: number;
    };
}

export interface BenchmarkDotNetBenchmarkJson {
    Benchmarks: BenchmarkDotnetBenchmark[];
}

function getHumanReadableUnitValue(seconds: number): [number, string] {
    if (seconds < 1.0e-6) {
        return [seconds * 1e9, 'nsec'];
    } else if (seconds < 1.0e-3) {
        return [seconds * 1e6, 'usec'];
    } else if (seconds < 1.0) {
        return [seconds * 1e3, 'msec'];
    } else {
        return [seconds, 'sec'];
    }
}

function getCommitFromPullRequestPayload(pr: PullRequest): Commit {
    // On pull_request hook, head_commit is not available
    const id: string = pr.head.sha;
    const username: string = pr.head.user.login;
    const user = {
        name: username, // XXX: Fallback, not correct
        username,
    };

    return {
        author: user,
        committer: user,
        id,
        message: pr.title,
        timestamp: pr.head.repo.updated_at,
        url: `${pr.html_url}/commits/${id}`,
    };
}

async function getCommitFromGitHubAPIRequest(githubToken: string): Promise<Commit> {
    const octocat = new github.GitHub(githubToken);

    const { status, data } = await octocat.repos.getCommit({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        ref: github.context.ref,
    });

    if (!(status === 200 || status === 304)) {
        throw new Error(`Could not fetch the head commit. Received code: ${status}`);
    }

    const { commit } = data;

    return {
        author: {
            name: commit.author.name,
            username: data.author.login,
            email: commit.author.email,
        },
        committer: {
            name: commit.committer.name,
            username: data.committer.login,
            email: commit.committer.email,
        },
        id: data.sha,
        message: commit.message,
        timestamp: commit.author.date,
        url: data.html_url,
    };
}

async function getCommit(config: Config): Promise<Commit> {
    const { githubToken, readCommitIdFromGit } = config;

    if (readCommitIdFromGit) {
        const id = (await git.readCommitId()).trim();
        const timestamp = await git.readCommitTimestamp();
        const repo = github.context.repo;
        const email = await git.readCommitEmail();
        const user = {
            name: email,
            username: email,
        };
        const message = await git.readCommitMessage();

        return {
            id,
            url: `https://github.com/${repo.owner}/${repo.repo}/commits/${id}`,
            timestamp,
            message,
            author: user,
            committer: user,
        };
    }

    if (github.context.payload.head_commit) {
        return github.context.payload.head_commit;
    }

    const pr = github.context.payload.pull_request;

    if (pr) {
        return getCommitFromPullRequestPayload(pr);
    }

    if (!githubToken) {
        throw new Error(
            `No commit information is found in payload: ${JSON.stringify(
                github.context.payload,
                null,
                2,
            )}. Also, no 'github-token' provided, could not fallback to GitHub API Request.`,
        );
    }

    return getCommitFromGitHubAPIRequest(githubToken);
}

function extractCargoResult(output: string): BenchmarkResult[] {
    const lines = output.split(/\r?\n/g);
    const ret = [];
    // Example:
    //   test bench_fib_20 ... bench:      37,174 ns/iter (+/- 7,527)
    const reExtract = /^test (.+)\s+\.\.\. bench:\s+([0-9,]+) ns\/iter \(\+\/- ([0-9,]+)\)$/;
    const reComma = /,/g;

    for (const line of lines) {
        const m = line.match(reExtract);
        if (m === null) {
            continue;
        }

        const name = m[1].trim();
        const value = parseInt(m[2].replace(reComma, ''), 10);
        const range = m[3].replace(reComma, '');

        ret.push({
            name,
            value,
            range: `± ${range}`,
            unit: 'ns/iter',
        });
    }

    return ret;
}

function extractGoResult(output: string): BenchmarkResult[] {
    const lines = output.split(/\r?\n/g);
    const ret = [];
    // Example:
    //   BenchmarkFib20-8           30000             41653 ns/op
    //   BenchmarkDoWithConfigurer1-8            30000000                42.3 ns/op
    const reExtract = /^(Benchmark\w+(?:\/?[\w()$%^&*-]*?)*?)(-\d+)?\s+(\d+)\s+([0-9.]+)\s+(.+)$/;

    for (const line of lines) {
        const m = line.match(reExtract);
        if (m === null) {
            continue;
        }

        const name = m[1];
        const procs = m[2] !== undefined ? m[2].slice(1) : null;
        const times = m[3];
        const value = parseFloat(m[4]);
        const unit = m[5];

        let extra = `${times} times`;
        if (procs !== null) {
            extra += `\n${procs} procs`;
        }

        ret.push({ name, value, unit, extra });
    }

    return ret;
}

function extractBenchmarkJsResult(output: string): BenchmarkResult[] {
    const lines = output.split(/\r?\n/g);
    const ret = [];
    // Example:
    //   fib(20) x 11,465 ops/sec ±1.12% (91 runs sampled)
    //   createObjectBuffer with 200 comments x 81.61 ops/sec ±1.70% (69 runs sampled)
    const reExtract = /^ x ([0-9,.]+)\s+(\S+)\s+((?:±|\+-)[^%]+%) \((\d+) runs sampled\)$/; // Note: Extract parts after benchmark name
    const reComma = /,/g;

    for (const line of lines) {
        const idx = line.lastIndexOf(' x ');
        if (idx === -1) {
            continue;
        }
        const name = line.slice(0, idx);
        const rest = line.slice(idx);

        const m = rest.match(reExtract);
        if (m === null) {
            continue;
        }

        const value = parseFloat(m[1].replace(reComma, ''));
        const unit = m[2];
        const range = m[3];
        const extra = `${m[4]} samples`;

        ret.push({ name, value, range, unit, extra });
    }

    return ret;
}

function extractPytestResult(output: string): BenchmarkResult[] {
    try {
        const json: PytestBenchmarkJson = JSON.parse(output);
        return json.benchmarks.map((bench) => {
            const stats = bench.stats;
            const name = bench.fullname;
            const value = stats.ops;
            const unit = 'iter/sec';
            const range = `stddev: ${stats.stddev}`;
            const [mean, meanUnit] = getHumanReadableUnitValue(stats.mean);
            const extra = `mean: ${mean} ${meanUnit}\nrounds: ${stats.rounds}`;
            return { name, value, unit, range, extra };
        });
    } catch (err: any) {
        throw new Error(
            `Output file for 'pytest' must be JSON file generated by --benchmark-json option: ${err.message}`,
        );
    }
}

function extractGoogleCppResult(output: string): BenchmarkResult[] {
    let json: GoogleCppBenchmarkJson;
    try {
        json = JSON.parse(output);
    } catch (err: any) {
        throw new Error(
            `Output file for 'googlecpp' must be JSON file generated by --benchmark_format=json option: ${err.message}`,
        );
    }
    return json.benchmarks.map((b) => {
        const name = b.name;
        const value = b.real_time;
        const unit = b.time_unit + '/iter';
        const extra = `iterations: ${b.iterations}\ncpu: ${b.cpu_time} ${b.time_unit}\nthreads: ${b.threads}`;
        return { name, value, unit, extra };
    });
}

function extractCatch2Result(output: string): BenchmarkResult[] {
    // Example:

    // benchmark name samples       iterations    estimated <-- Start benchmark section
    //                mean          low mean      high mean <-- Ignored
    //                std dev       low std dev   high std dev <-- Ignored
    // ----------------------------------------------------- <-- Ignored
    // Fibonacci 20   100           2             8.4318 ms <-- Start actual benchmark
    //                43.186 us     41.402 us     46.246 us <-- Actual benchmark data
    //                11.719 us      7.847 us     17.747 us <-- Ignored

    const reTestCaseStart = /^benchmark name +samples +iterations +estimated/;
    const reBenchmarkStart = /(\d+) +(\d+) +(?:\d+(\.\d+)?) (?:ns|ms|us|s)\s*$/;
    const reBenchmarkValues =
        /^ +(\d+(?:\.\d+)?) (ns|us|ms|s) +(?:\d+(?:\.\d+)?) (?:ns|us|ms|s) +(?:\d+(?:\.\d+)?) (?:ns|us|ms|s)/;
    const reEmptyLine = /^\s*$/;
    const reSeparator = /^-+$/;

    const lines = output.split(/\r?\n/g);
    lines.reverse();
    let lnum = 0;
    function nextLine(): [string | null, number] {
        return [lines.pop() ?? null, ++lnum];
    }

    function extractBench(): BenchmarkResult | null {
        const startLine = nextLine()[0];
        if (startLine === null) {
            return null;
        }

        const start = startLine.match(reBenchmarkStart);
        if (start === null) {
            return null; // No more benchmark found. Go to next benchmark suite
        }

        const extra = `${start[1]} samples\n${start[2]} iterations`;
        const name = startLine.slice(0, start.index).trim();

        const [meanLine, meanLineNum] = nextLine();
        const mean = meanLine?.match(reBenchmarkValues);
        if (!mean) {
            throw new Error(
                `Mean values cannot be retrieved for benchmark '${name}' on parsing input '${
                    meanLine ?? 'EOF'
                }' at line ${meanLineNum}`,
            );
        }

        const value = parseFloat(mean[1]);
        const unit = mean[2];

        const [stdDevLine, stdDevLineNum] = nextLine();
        const stdDev = stdDevLine?.match(reBenchmarkValues);
        if (!stdDev) {
            throw new Error(
                `Std-dev values cannot be retrieved for benchmark '${name}' on parsing '${
                    stdDevLine ?? 'EOF'
                }' at line ${stdDevLineNum}`,
            );
        }

        const range = '± ' + stdDev[1].trim();

        // Skip empty line
        const [emptyLine, emptyLineNum] = nextLine();
        if (emptyLine === null || !reEmptyLine.test(emptyLine)) {
            throw new Error(
                `Empty line is not following after 'std dev' line of benchmark '${name}' at line ${emptyLineNum}`,
            );
        }

        return { name, value, range, unit, extra };
    }

    const ret = [];
    while (lines.length > 0) {
        // Search header of benchmark section
        const line = nextLine()[0];
        if (line === null) {
            break; // All lines were eaten
        }
        if (!reTestCaseStart.test(line)) {
            continue;
        }

        // Eat until a separator line appears
        for (;;) {
            const [line, num] = nextLine();
            if (line === null) {
                throw new Error(`Separator '------' does not appear after benchmark suite at line ${num}`);
            }
            if (reSeparator.test(line)) {
                break;
            }
        }

        let benchFound = false;
        for (;;) {
            const res = extractBench();
            if (res === null) {
                break;
            }
            ret.push(res);
            benchFound = true;
        }
        if (!benchFound) {
            throw new Error(`No benchmark found for bench suite. Possibly mangled output from Catch2:\n\n${output}`);
        }
    }

    return ret;
}

function extractJuliaBenchmarkHelper([_, bench]: JuliaBenchmarkGroup, labels: string[] = []): BenchmarkResult[] {
    const res: BenchmarkResult[] = [];
    for (const key in bench.data) {
        const value = bench.data[key];
        if (value[0] === 'BenchmarkGroup') {
            res.push(...extractJuliaBenchmarkHelper(value as JuliaBenchmarkGroup, [...labels, key]));
        } else if (value[0] === 'TrialEstimate') {
            const v = value as JuliaBenchmarkTrialEstimate;
            res.push({
                name: [...labels, key].join('/'),
                value: v[1].time,
                unit: 'ns',
                extra: `gctime=${v[1].gctime}\nmemory=${v[1].memory}\nallocs=${v[1].allocs}\nparams=${JSON.stringify(
                    v[1].params[1],
                )}`,
            });
        } else if (value[0] === 'Trial') {
            throw new Error(
                `Only TrialEstimate is supported currently. You need to apply apply an estimation (minimum/median/mean/maximum/std) before saving the JSON file.`,
            );
        } else {
            throw new Error(`Unsupported type ${value[0]}`);
        }
    }
    return res;
}

function extractJuliaBenchmarkResult(output: string): BenchmarkResult[] {
    let json: JuliaBenchmarkJson;
    try {
        json = JSON.parse(output);
    } catch (err: any) {
        throw new Error(
            `Output file for 'julia' must be JSON file generated by BenchmarkTools.save("output.json", suit::BenchmarkGroup) :  ${err.message}`,
        );
    }

    const res: BenchmarkResult[] = [];
    for (const group of json[1]) {
        res.push(...extractJuliaBenchmarkHelper(group));
    }

    return res;
}

function extractJmhResult(output: string): BenchmarkResult[] {
    let json: JmhBenchmarkJson[];
    try {
        json = JSON.parse(output);
    } catch (err: any) {
        throw new Error(`Output file for 'jmh' must be JSON file generated by -rf json option: ${err.message}`);
    }
    return json.map((b) => {
        const name = b.benchmark;
        const value = b.primaryMetric.score;
        const unit = b.primaryMetric.scoreUnit;
        const extra = `iterations: ${b.measurementIterations}\nforks: ${b.forks}\nthreads: ${b.threads}`;
        return { name, value, unit, extra };
    });
}

function extractBenchmarkDotnetResult(output: string): BenchmarkResult[] {
    let json: BenchmarkDotNetBenchmarkJson;
    try {
        json = JSON.parse(output);
    } catch (err: any) {
        throw new Error(
            `Output file for 'benchmarkdotnet' must be JSON file generated by '--exporters json' option or by adding the JsonExporter to your run config: ${err.message}`,
        );
    }

    return json.Benchmarks.map((benchmark) => {
        const name = benchmark.FullName;
        const value = benchmark.Statistics.Mean;
        const stdDev = benchmark.Statistics.StandardDeviation;
        const range = `± ${stdDev}`;
        return { name, value, unit: 'ns', range };
    });
}

function extractCustomBenchmarkResult(output: string): BenchmarkResult[] {
    try {
        const json: BenchmarkResult[] = JSON.parse(output);
        return json.map(({ name, value, unit, range, extra }) => {
            return { name, value, unit, range, extra };
        });
    } catch (err: any) {
        throw new Error(
            `Output file for 'custom-(bigger|smaller)-is-better' must be JSON file containing an array of entries in BenchmarkResult format: ${err.message}`,
        );
    }
}

function extractLuauBenchmarkResult(output: string): BenchmarkResult[] {
    const lines = output.split(/\n/);
    const results: BenchmarkResult[] = [];

    output;
    for (const line of lines) {
        if (!line.startsWith('SUCCESS')) continue;
        const [_0, name, _2, valueStr, _4, range, _6, extra] = line.split(/\s+/);

        results.push({
            name: name,
            value: parseFloat(valueStr),
            unit: valueStr.replace(/.[0-9]+/g, ''),
            range: `±${range}`,
            extra: extra,
        });
    }

    return results;
}

export async function extractResult(config: Config): Promise<Benchmark> {
    const output = await fs.readFile(config.outputFilePath, 'utf8');
    const { tool } = config;
    let benches: BenchmarkResult[];

    switch (tool) {
        case 'cargo':
            benches = extractCargoResult(output);
            break;
        case 'go':
            benches = extractGoResult(output);
            break;
        case 'benchmarkjs':
            benches = extractBenchmarkJsResult(output);
            break;
        case 'pytest':
            benches = extractPytestResult(output);
            break;
        case 'googlecpp':
            benches = extractGoogleCppResult(output);
            break;
        case 'catch2':
            benches = extractCatch2Result(output);
            break;
        case 'julia':
            benches = extractJuliaBenchmarkResult(output);
            break;
            break;
        case 'jmh':
            benches = extractJmhResult(output);
            break;
        case 'benchmarkdotnet':
            benches = extractBenchmarkDotnetResult(output);
            break;
        case 'customBiggerIsBetter':
            benches = extractCustomBenchmarkResult(output);
            break;
        case 'customSmallerIsBetter':
            benches = extractCustomBenchmarkResult(output);
            break;
        case 'benchmarkluau':
            benches = extractLuauBenchmarkResult(output);
            break;
        default:
            throw new Error(`FATAL: Unexpected tool: '${tool}'`);
    }

    if (benches.length === 0) {
        throw new Error(`No benchmark result was found in ${config.outputFilePath}. Benchmark output was '${output}'`);
    }

    const commit = await getCommit(config);

    return {
        commit,
        date: Date.now(),
        tool,
        benches,
    };
}
