/* eslint-disable @typescript-eslint/naming-convention */
import * as core from '@actions/core';
import { promises as fs } from 'fs';
import * as github from '@actions/github';
import gitCommitInfo from 'git-commit-info';
import { branchName } from './git';
import { Config, ToolType } from './config';

export interface BenchmarkResult {
    name: string; // metric name
    value: number;
    range?: string;
    unit: string;
    extra?: string;
    testName?: string;
}

interface GitHubUser {
    email?: string;
    name?: string;
    username?: string;
}

export interface Commit {
    author: GitHubUser;
    committer: GitHubUser;
    distinct?: unknown; // Unused
    id: string;
    message: string;
    timestamp?: string;
    tree_id?: unknown; // Unused
    url: string;
    repo: string;
    branch?: string;
    ref?: string;
    prNumber?: number;
    repoUrl: string;
}

interface PullRequest {
    [key: string]: any;
    number: number;
    html_url?: string;
    body?: string;
}

/* The JSON supported by the Nyrkio API.
 * Note that this is only here in order to support pass thru sending this to Nyrkio.com.
 * We don't parse this to the common Benchmark object and therefore you cannot store NyrkioJson
 * input into the legacy threshold based system.
 */
export interface NyrkioMetrics {
    name: string;
    unit: string;
    value: number;
    direction?: string;
}

export interface NyrkioJson {
    timestamp: number;
    metrics: NyrkioMetrics[];
    attributes: {
        git_commit: string;
        git_repo: string;
        branch: string;
    };
    extra_info?: object;
}

export interface NyrkioJsonPath {
    path: string;
    results: NyrkioJson[];
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
    params: object;
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
    core.debug(JSON.stringify(pr, null, 4));
    const id: string = pr.head.sha;
    const username: string = pr.head.user.login;
    const user = {
        name: username, // XXX: Fallback, not correct
        username,
    };
    const commitUrl = pr.html_url ?? pr.base.repo.full_name ?? pr._links.html;
    return {
        author: user,
        committer: user,
        id,
        message: pr.title,
        timestamp: pr.head.repo.updated_at,
        repo: pr.base.repo.full_name,
        url: pr.head.url,
        branch: pr.base.ref_name || pr.base.ref,
        prNumber: pr.number,
        repoUrl: commitUrl,
    };
}

async function getCommitFromGitHubAPIRequest(githubToken: string, ref?: string): Promise<Commit> {
    const octocat = github.getOctokit(githubToken);

    const { status, data } = await octocat.rest.repos.getCommit({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        ref: ref ?? github.context.ref,
    });

    if (!(status === 200 || status === 304)) {
        throw new Error(`Could not fetch the head commit. Received code: ${status}`);
    }

    const { commit } = data;

    return {
        author: {
            name: commit.author?.name,
            username: data.author?.login,
            email: commit.author?.email,
        },
        committer: {
            name: commit.committer?.name,
            username: data.committer?.login,
            email: commit.committer?.email,
        },
        id: data.sha,
        message: commit.message,
        timestamp: commit.author?.date,
        url: commit.url,
        repo: github.context.repo.repo,
        repoUrl: data.html_url,
    };
}

// Visible for testing / mocking
export async function getCommitFromLocalRepo(commit: any): Promise<Commit> {
    return {
        author: {
            name: commit.author?.name,
            username: commit.author?.login,
            email: commit.author?.email,
        },
        committer: {
            name: commit.committer?.name,
            username: commit.committer?.login,
            email: commit.committer?.email,
        },
        id: commit.commit,
        message: commit.message,
        timestamp: commit.date,
        url: `file:///${process.cwd()}/commits/${commit.commit}`,
        repo: 'local_checkout',
        repoUrl: 'file:///' + process.cwd(),
    };
}

async function getCommit(githubToken?: string, ref?: string): Promise<Commit> {
    if (github.context.payload.head_commit) {
        core.debug('Return head_commit');
        core.debug(JSON.stringify(github.context.payload, null, 4));
        const commit: Commit = github.context.payload.head_commit;
        commit.url = commit.url ?? github.context.payload.head_commit.url;
        commit.repo =
            github.context.payload.repository?.full_name ??
            commit.url.split(/\/commit\//)[0].replace('https://github.com/', '');
        commit.repoUrl = commit.url.split(/\/commit\//)[0];

        return commit;
    }

    const pr = github.context.payload.pull_request;

    if (pr) {
        core.debug('Return github.context.payload.pull_request');
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
    } else {
        return getCommitFromGitHubAPIRequest(githubToken, ref);
    }

    const localRepo = gitCommitInfo();
    if (localRepo) {
        return getCommitFromLocalRepo(localRepo);
    }
}

async function addCommitBranch(commit: Commit): Promise<undefined> {
    console.log(commit);
    if (commit.prNumber) {
        // For pull requests, we actually want the base (aka target) branch
        const maybeBranch = github.context.payload.pull_request?.base.ref;
        if (maybeBranch) {
            console.log(
                `Found github.context.payload.pull_request.base.ref = ${github.context.payload.pull_request?.base.ref}`,
            );
            commit.branch = maybeBranch;
            return;
        }
    }
    if (github.context.payload.ref) {
        const maybeBranch = github.context.payload.ref.split('/')[-1];
        if (maybeBranch) {
            commit.branch = maybeBranch;
            return;
        }
    }
    if (commit.ref) {
        commit.branch = commit.ref;
        return;
    }
    const maybeBranch = await branchName();
    if (maybeBranch !== undefined) {
        console.log('Use the branch name of whatever is checked out in my CWD.');
        commit.branch = maybeBranch ? maybeBranch : '';
    }
    return;
}

function extractCargoResult(output: string): BenchmarkResult[] {
    const lines = output.split(/\r?\n/g);
    const ret = [];
    const reExtract = /^test (.+)\s+\.\.\. bench:\s+([0-9,.]+) (\w+\/\w+) \(\+\/- ([0-9,.]+)\)$/;
    const reComma = /,/g;

    for (const line of lines) {
        const m = line.match(reExtract);
        if (m === null) {
            continue;
        }

        const name = m[1].trim();
        const value = parseFloat(m[2].replace(reComma, ''));
        const unit = m[3].trim();
        const range = m[4].replace(reComma, '');

        ret.push({
            name,
            value,
            range: `± ${range}`,
            unit: unit,
        });
    }

    return ret;
}

function extractCriterionResult(output: string): BenchmarkResult[] {
    const lines = output.split(/\r?\n/g);
    const ret = [];
    const reTestName = /Benchmarking\W+(.+):\W+Analyzing/;
    const reResult = /(time|thrpt):\W+\[(.+) (.+) (.+) (.+) (.+) (.+)\]/;
    const reComma = /,/g;
    const reColon = /: */g;

    let testName = 'default_testname';
    core.debug(`Processing ${lines.length} lines`);
    for (const line of lines) {
        const mm = line.match(reTestName);
        if (mm) {
            testName = mm[1].replace(reColon, '/').trim().replace(/'/g, '');
            core.debug(testName);
            continue;
        }
        const m = line.match(reResult);
        if (m === null) {
            continue;
        }

        const name = m[1];
        const value = parseFloat(m[4].replace(reComma, ''));
        const unit = m[5].trim();
        const min = m[2].replace(reComma, '');
        const max = m[6].replace(reComma, '');
        // console.log(name,value,unit);

        ret.push({
            name,
            value,
            range: `[${min}, ${max}]`,
            unit: unit,
            testName,
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

    // Example if someone has used the ReportMetric function to add additional metrics to each benchmark:
    // BenchmarkThing-16    	       1	95258906556 ns/op	        64.02 UnitsForMeasure2	        31.13 UnitsForMeasure3

    // reference, "Proposal: Go Benchmark Data Format": https://go.googlesource.com/proposal/+/master/design/14313-benchmark-format.md
    // "A benchmark result line has the general form: <name> <iterations> <value> <unit> [<value> <unit>...]"
    // "The fields are separated by runs of space characters (as defined by unicode.IsSpace), so the line can be parsed with strings.Fields. The line must have an even number of fields, and at least four."
    const reExtract =
        /^(?<name>Benchmark\w+[\w()$%^&*-=|,[\]{}"#]*?)(?<procs>-\d+)?\s+(?<times>\d+)\s+(?<remainder>.+)$/;

    for (const line of lines) {
        const m = line.match(reExtract);
        if (m?.groups) {
            const procs = m.groups.procs !== undefined ? m.groups.procs.slice(1) : null;
            const times = m.groups.times;
            const remainder = m.groups.remainder;

            const pieces = remainder.split(/[ \t]+/);

            // This is done for backwards compatibility with Go benchmarks that had multiple metrics in output,
            // but they were not extracted properly before v1.18.0
            if (pieces.length > 2) {
                pieces.unshift(pieces[0], remainder.slice(remainder.indexOf(pieces[1])));
            }

            for (let i = 0; i < pieces.length; i = i + 2) {
                let extra = `${times} times`.replace(/\s\s+/g, ' ');
                if (procs !== null) {
                    extra += `\n${procs} procs`;
                }
                const value = parseFloat(pieces[i]);
                const unit = pieces[i + 1];
                let name;
                if (i > 0) {
                    name = m.groups.name + ' - ' + unit;
                } else {
                    name = m.groups.name;
                }
                ret.push({ name, value, unit, extra });
            }
        }
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

    const reTestCaseStart = /^benchmark name +samples +iterations +(estimated|est run time)/;
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
        const params = b.params ? ' ( ' + JSON.stringify(b.params) + ' )' : '';
        const extra = `iterations: ${b.measurementIterations}\nforks: ${b.forks}\nthreads: ${b.threads}`;
        return { name: name + params, value, unit, extra };
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
function parseTimeOutput(line: string): number | undefined {
    core.debug(`parse time ${line}`);
    const t = line.split('\t')[1];
    if (t === undefined) return;
    const tparts = t.split('m');

    core.debug(tparts[0]);
    if (tparts[1] === undefined || !tparts[1].endsWith('s')) return;
    return parseFloat(tparts[0]) * 60.0 + parseFloat(tparts[1].substring(-1));
}
function extractTimeBenchmarkResult(output: string): BenchmarkResult[] {
    const lines = output.split(/\n/);
    const results: BenchmarkResult[] = [];
    let firstline = true;
    let name = 'default_testname';

    for (const line of lines) {
        core.debug(line);
        if (firstline) {
            name = line;
            firstline = false;
            continue;
        }
        if (line.startsWith('real')) {
            const v = parseTimeOutput(line);
            core.debug(`${v}`);
            if (v !== undefined)
                results.push({
                    testName: name,
                    name: 'real',
                    value: v,
                    unit: 's',
                });
        }
        if (line.startsWith('user')) {
            const v = parseTimeOutput(line);

            core.debug(`${v}`);
            if (v !== undefined)
                results.push({
                    testName: name,
                    name: 'user',
                    value: v,
                    unit: 's',
                });
        }
        if (line.startsWith('sys')) {
            const v = parseTimeOutput(line);
            core.debug(`${v}`);
            if (v !== undefined)
                results.push({
                    testName: name,
                    name: 'sys',
                    value: v,
                    unit: 's',
                });
            firstline = true;
        }
        core.debug('loop');
    }

    return results;
}

function maybeSetFailed(e: any, neverFail: boolean) {
    if (!neverFail) {
        core.setFailed(e ? e.message : 'e is undefined');
        return false;
    } else {
        console.error(e ? e.message : 'e is undefined');
        console.error('Note: never-fail is true. Will exit successfully to keep the build green.');
        return true;
    }
}

async function readNyrkioJsonFiles(outputFilePath: string, neverFail: boolean): Promise<string> {
    let output = '';
    // outputFilePath is actually a directory
    fs.readdir(outputFilePath)
        .then((dirList) =>
            dirList.forEach((fileName) => {
                const filePath = outputFilePath + '/' + fileName;
                fs.readFile(filePath, 'utf8')
                    .then((fileContent) => {
                        output = '{path: "' + fileName + '", results: ' + fileContent + '}' + '\n';
                    })
                    .catch((err) => {
                        maybeSetFailed(err, neverFail);
                    });
            }),
        )
        .catch((err) => {
            maybeSetFailed(err, neverFail);
        });
    output = '[\n' + output + ']\n';
    return output;
}

export async function extractNyrkioJsonResult(config: Config): Promise<[NyrkioJsonPath[], Commit]> {
    const { githubToken, ref, outputFilePath, neverFail } = config;
    let json: NyrkioJsonPath[];
    const output = await readNyrkioJsonFiles(outputFilePath, neverFail);
    try {
        json = JSON.parse(output);
    } catch (err: any) {
        throw new Error(
            `Output file for 'NyrkioJson' must be inte format defined at http://nyrkio.com/openapi :  ${err.message}`,
        );
    }

    const commit = await getCommit(githubToken, ref);
    await addCommitBranch(commit);

    return [json, commit];
}

export async function extractResult(config: Config): Promise<Benchmark> {
    const { tool, githubToken, ref, outputFilePath } = config;
    const output: string = await fs.readFile(outputFilePath, 'utf8');
    let benches: BenchmarkResult[];
    core.debug(output);

    switch (tool) {
        case 'cargo':
            benches = extractCargoResult(output);
            break;
        case 'criterion':
            benches = extractCriterionResult(output);
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
        case 'jmh':
            benches = extractJmhResult(output);
            break;
        case 'benchmarkdotnet':
            benches = extractBenchmarkDotnetResult(output);
            break;
        case 'time':
            benches = extractTimeBenchmarkResult(output);
            console.log(JSON.stringify(benches));
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
    console.log('get commit');
    const commit = await getCommit(githubToken, ref);
    await addCommitBranch(commit);
    return {
        commit,
        date: Date.now(),
        tool,
        benches,
    };
}
