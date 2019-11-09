"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const github = __importStar(require("@actions/github"));
const core = __importStar(require("@actions/core"));
function extractCargoResult(output) {
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
function extractGoResult(output) {
    const lines = output.split('\n');
    const ret = [];
    // Example:
    //   BenchmarkFib20-8           30000             41653 ns/op
    const reExtract = /^(Benchmark\w+)\S*\s+\d+\s+(\d+)\s+(.+)$/;
    for (const line of lines) {
        const m = line.match(reExtract);
        if (m === null) {
            continue;
        }
        const name = m[1];
        const value = parseInt(m[2], 10);
        const unit = m[3];
        ret.push({ name, value, unit });
    }
    return ret;
}
function extractBenchmarkJsResult(output) {
    const lines = output.split('\n');
    const ret = [];
    // Example:
    //   fib(20) x 11,465 ops/sec ±1.12% (91 runs sampled)
    const reExtract = /^ x ([0-9,]+)\s+(\S+)\s+((?:±|\+-)[^%]+%) \(\d+ runs sampled\)$/; // Note: Extract parts after benchmark name
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
        const value = parseInt(m[1].replace(reComma, ''), 10);
        const unit = m[2];
        const range = m[3];
        ret.push({ name, value, range, unit });
    }
    return ret;
}
async function extractResult(config) {
    const output = await fs_1.promises.readFile(config.outputFilePath, 'utf8');
    const { tool } = config;
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
        default:
            throw new Error(`FATAL: Unexpected tool: '${tool}'`);
    }
    if (benches.length === 0) {
        throw new Error(`No benchmark result was found in ${config.outputFilePath}. Benchmark output was '${output}'`);
    }
    core.debug(`GitHub payload: ${github.context.payload}`);
    return {
        commit: github.context.payload.head_commit,
        date: Date.now(),
        tool,
        benches,
    };
}
exports.extractResult = extractResult;
//# sourceMappingURL=extract.js.map