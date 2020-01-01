import { promises as fs } from 'fs';
import * as github from '@actions/github';
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

function getCommit(): Commit {
    /* eslint-disable @typescript-eslint/camelcase */
    if (github.context.payload.head_commit) {
        return github.context.payload.head_commit;
    }

    const pr = github.context.payload.pull_request;
    if (!pr) {
        throw new Error(
            `No commit information is found in payload: ${JSON.stringify(github.context.payload, null, 2)}`,
        );
    }

    // On pull_request hook, head_commit is not available
    const message: string = pr.title;
    const id: string = pr.head.sha;
    const timestamp: string = pr.head.repo.updated_at;
    const url = `${pr.html_url}/commits/${id}`;
    const name: string = pr.head.user.login;
    const user = {
        name,
        username: name, // XXX: Fallback, not correct
    };

    return {
        author: user,
        committer: user,
        id,
        message,
        timestamp,
        url,
    };
    /* eslint-enable @typescript-eslint/camelcase */
}

function extractCargoResult(output: string): BenchmarkResult[] {
    const lines = output.split('\n');
    const ret = [];
    // Example:
    //   test bench_fib_20 ... bench:      37,174 ns/iter (+/- 7,527)
    const reExtract = /^test (\w+)\s+\.\.\. bench:\s+([0-9,]+) ns\/iter \((\+\/- [0-9,]+)\)$/;
    const reComma = /,/g;

    for (const line of lines) {
        const m = line.match(reExtract);
        if (m === null) {
            continue;
        }

        const name = m[1];
        const value = parseInt(m[2].replace(reComma, ''), 10);
        const range = m[3];

        ret.push({
            name,
            value,
            range,
            unit: 'ns/iter',
        });
    }

    return ret;
}

function extractGoResult(output: string): BenchmarkResult[] {
    const lines = output.split('\n');
    const ret = [];
    // Example:
    //   BenchmarkFib20-8           30000             41653 ns/op
    //   BenchmarkDoWithConfigurer1-8            30000000                42.3 ns/op
    const reExtract = /^(Benchmark\w+)(-\d+)?\s+(\d+)\s+([0-9.]+)\s+(.+)$/;

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
    const lines = output.split('\n');
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
        return json.benchmarks.map(bench => {
            const stats = bench.stats;
            const name = bench.fullname;
            const value = stats.ops;
            const unit = 'iter/sec';
            const range = `stddev: ${stats.stddev}`;
            const [mean, meanUnit] = getHumanReadableUnitValue(stats.mean);
            const extra = `mean: ${mean} ${meanUnit}\nrounds: ${stats.rounds}`;
            return { name, value, unit, range, extra };
        });
    } catch (err) {
        throw new Error(
            `Output file for 'pytest' must be JSON file generated by --benchmark-json option: ${err.message}`,
        );
    }
}

function extractGoogleCppResult(output: string): BenchmarkResult[] {
    let json: GoogleCppBenchmarkJson;
    try {
        json = JSON.parse(output);
    } catch (err) {
        throw new Error(
            `Output file for 'googlecpp' must be JSON file generated by --benchmark_format=json option: ${err.message}`,
        );
    }
    return json.benchmarks.map(b => {
        const name = b.name;
        const value = b.real_time;
        const unit = b.time_unit + '/iter';
        const extra = `iterations: ${b.iterations}\ncpu: ${b.cpu_time} ${b.time_unit}\nthreads: ${b.threads}`;
        return { name, value, unit, extra };
    });
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
        default:
            throw new Error(`FATAL: Unexpected tool: '${tool}'`);
    }

    if (benches.length === 0) {
        throw new Error(`No benchmark result was found in ${config.outputFilePath}. Benchmark output was '${output}'`);
    }

    const commit = getCommit();

    return {
        commit,
        date: Date.now(),
        tool,
        benches,
    };
}
