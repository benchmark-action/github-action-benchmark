"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractResult = void 0;
/* eslint-disable @typescript-eslint/naming-convention */
const fs_1 = require("fs");
const github = __importStar(require("@actions/github"));
function getHumanReadableUnitValue(seconds) {
    if (seconds < 1.0e-6) {
        return [seconds * 1e9, 'nsec'];
    }
    else if (seconds < 1.0e-3) {
        return [seconds * 1e6, 'usec'];
    }
    else if (seconds < 1.0) {
        return [seconds * 1e3, 'msec'];
    }
    else {
        return [seconds, 'sec'];
    }
}
function getCommitFromPullRequestPayload(pr) {
    // On pull_request hook, head_commit is not available
    const id = pr.head.sha;
    const username = pr.head.user.login;
    const user = {
        name: username,
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
async function getCommitFromGitHubAPIRequest(githubToken, ref) {
    var _a, _b, _c, _d, _e, _f, _g;
    const octocat = github.getOctokit(githubToken);
    const { status, data } = await octocat.rest.repos.getCommit({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        ref: ref !== null && ref !== void 0 ? ref : github.context.ref,
    });
    if (!(status === 200 || status === 304)) {
        throw new Error(`Could not fetch the head commit. Received code: ${status}`);
    }
    const { commit } = data;
    return {
        author: {
            name: (_a = commit.author) === null || _a === void 0 ? void 0 : _a.name,
            username: (_b = data.author) === null || _b === void 0 ? void 0 : _b.login,
            email: (_c = commit.author) === null || _c === void 0 ? void 0 : _c.email,
        },
        committer: {
            name: (_d = commit.committer) === null || _d === void 0 ? void 0 : _d.name,
            username: (_e = data.committer) === null || _e === void 0 ? void 0 : _e.login,
            email: (_f = commit.committer) === null || _f === void 0 ? void 0 : _f.email,
        },
        id: data.sha,
        message: commit.message,
        timestamp: (_g = commit.author) === null || _g === void 0 ? void 0 : _g.date,
        url: data.html_url,
    };
}
async function getCommit(githubToken, ref) {
    if (github.context.payload.head_commit) {
        return github.context.payload.head_commit;
    }
    const pr = github.context.payload.pull_request;
    if (pr) {
        return getCommitFromPullRequestPayload(pr);
    }
    if (!githubToken) {
        throw new Error(`No commit information is found in payload: ${JSON.stringify(github.context.payload, null, 2)}. Also, no 'github-token' provided, could not fallback to GitHub API Request.`);
    }
    return getCommitFromGitHubAPIRequest(githubToken, ref);
}
function extractCargoResult(output) {
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
function extractGoResult(output) {
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
    const reExtract = /^(?<name>Benchmark\w+[\w()$%^&*-=|,[\]{}"#]*?)(?<procs>-\d+)?\s+(?<times>\d+)\s+(?<remainder>.+)$/;
    for (const line of lines) {
        const m = line.match(reExtract);
        if (m === null || m === void 0 ? void 0 : m.groups) {
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
                }
                else {
                    name = m.groups.name;
                }
                ret.push({ name, value, unit, extra });
            }
        }
    }
    return ret;
}
function extractBenchmarkJsResult(output) {
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
function extractPytestResult(output) {
    try {
        const json = JSON.parse(output);
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
    }
    catch (err) {
        throw new Error(`Output file for 'pytest' must be JSON file generated by --benchmark-json option: ${err.message}`);
    }
}
function extractGoogleCppResult(output) {
    let json;
    try {
        json = JSON.parse(output);
    }
    catch (err) {
        throw new Error(`Output file for 'googlecpp' must be JSON file generated by --benchmark_format=json option: ${err.message}`);
    }
    return json.benchmarks.map((b) => {
        const name = b.name;
        const value = b.real_time;
        const unit = b.time_unit + '/iter';
        const extra = `iterations: ${b.iterations}\ncpu: ${b.cpu_time} ${b.time_unit}\nthreads: ${b.threads}`;
        return { name, value, unit, extra };
    });
}
function extractCatch2Result(output) {
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
    const reBenchmarkValues = /^ +(\d+(?:\.\d+)?) (ns|us|ms|s) +(?:\d+(?:\.\d+)?) (?:ns|us|ms|s) +(?:\d+(?:\.\d+)?) (?:ns|us|ms|s)/;
    const reEmptyLine = /^\s*$/;
    const reSeparator = /^-+$/;
    const lines = output.split(/\r?\n/g);
    lines.reverse();
    let lnum = 0;
    function nextLine() {
        var _a;
        return [(_a = lines.pop()) !== null && _a !== void 0 ? _a : null, ++lnum];
    }
    function extractBench() {
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
        const mean = meanLine === null || meanLine === void 0 ? void 0 : meanLine.match(reBenchmarkValues);
        if (!mean) {
            throw new Error(`Mean values cannot be retrieved for benchmark '${name}' on parsing input '${meanLine !== null && meanLine !== void 0 ? meanLine : 'EOF'}' at line ${meanLineNum}`);
        }
        const value = parseFloat(mean[1]);
        const unit = mean[2];
        const [stdDevLine, stdDevLineNum] = nextLine();
        const stdDev = stdDevLine === null || stdDevLine === void 0 ? void 0 : stdDevLine.match(reBenchmarkValues);
        if (!stdDev) {
            throw new Error(`Std-dev values cannot be retrieved for benchmark '${name}' on parsing '${stdDevLine !== null && stdDevLine !== void 0 ? stdDevLine : 'EOF'}' at line ${stdDevLineNum}`);
        }
        const range = '± ' + stdDev[1].trim();
        // Skip empty line
        const [emptyLine, emptyLineNum] = nextLine();
        if (emptyLine === null || !reEmptyLine.test(emptyLine)) {
            throw new Error(`Empty line is not following after 'std dev' line of benchmark '${name}' at line ${emptyLineNum}`);
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
function extractJuliaBenchmarkHelper([_, bench], labels = []) {
    const res = [];
    for (const key in bench.data) {
        const value = bench.data[key];
        if (value[0] === 'BenchmarkGroup') {
            res.push(...extractJuliaBenchmarkHelper(value, [...labels, key]));
        }
        else if (value[0] === 'TrialEstimate') {
            const v = value;
            res.push({
                name: [...labels, key].join('/'),
                value: v[1].time,
                unit: 'ns',
                extra: `gctime=${v[1].gctime}\nmemory=${v[1].memory}\nallocs=${v[1].allocs}\nparams=${JSON.stringify(v[1].params[1])}`,
            });
        }
        else if (value[0] === 'Trial') {
            throw new Error(`Only TrialEstimate is supported currently. You need to apply apply an estimation (minimum/median/mean/maximum/std) before saving the JSON file.`);
        }
        else {
            throw new Error(`Unsupported type ${value[0]}`);
        }
    }
    return res;
}
function extractJuliaBenchmarkResult(output) {
    let json;
    try {
        json = JSON.parse(output);
    }
    catch (err) {
        throw new Error(`Output file for 'julia' must be JSON file generated by BenchmarkTools.save("output.json", suit::BenchmarkGroup) :  ${err.message}`);
    }
    const res = [];
    for (const group of json[1]) {
        res.push(...extractJuliaBenchmarkHelper(group));
    }
    return res;
}
function extractJmhResult(output) {
    let json;
    try {
        json = JSON.parse(output);
    }
    catch (err) {
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
function extractBenchmarkDotnetResult(output) {
    let json;
    try {
        json = JSON.parse(output);
    }
    catch (err) {
        throw new Error(`Output file for 'benchmarkdotnet' must be JSON file generated by '--exporters json' option or by adding the JsonExporter to your run config: ${err.message}`);
    }
    return json.Benchmarks.map((benchmark) => {
        const name = benchmark.FullName;
        const value = benchmark.Statistics.Mean;
        const stdDev = benchmark.Statistics.StandardDeviation;
        const range = `± ${stdDev}`;
        return { name, value, unit: 'ns', range };
    });
}
function extractCustomBenchmarkResult(output) {
    try {
        const json = JSON.parse(output);
        return json.map(({ name, value, unit, range, extra }) => {
            return { name, value, unit, range, extra };
        });
    }
    catch (err) {
        throw new Error(`Output file for 'custom-(bigger|smaller)-is-better' must be JSON file containing an array of entries in BenchmarkResult format: ${err.message}`);
    }
}
function extractLuauBenchmarkResult(output) {
    const lines = output.split(/\n/);
    const results = [];
    output;
    for (const line of lines) {
        if (!line.startsWith('SUCCESS'))
            continue;
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
async function extractResult(config) {
    const output = await fs_1.promises.readFile(config.outputFilePath, 'utf8');
    const { tool, githubToken, ref } = config;
    let benches;
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
    const commit = await getCommit(githubToken, ref);
    return {
        commit,
        date: Date.now(),
        tool,
        benches,
    };
}
exports.extractResult = extractResult;
//# sourceMappingURL=extract.js.map