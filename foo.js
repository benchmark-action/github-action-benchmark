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

const output = `goos: linux
goarch: amd64
BenchmarkFib10-2   	 3000000	       454 ns/op
BenchmarkFib20-2   	   30000	     57039 ns/op
PASS
ok  	_/home/runner/work/github-action-benchmark/github-action-benchmark/examples/go	4.105s
`;
console.log(extractGoResult(output));

function extractBenchmarkJsResult(output) {
    const lines = output.split('\n');
    const ret = [];
    // Example:
    //   fib(20) x 11,465 ops/sec ±1.12% (91 runs sampled)
    const reExtract = /^ x ([0-9,]+)\s+(\S+)\s+(?:±|\+-)([^%]+%) \(\d+ runs sampled\)$/; // Note: Extract parts after benchmark name
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

const output2 = `fib(10) x 1,321,070 ops/sec ±2.03% (91 runs sampled)
fib(20) x 11,465 ops/sec ±1.12% (91 runs sampled)
`;
console.log(extractBenchmarkJsResult(output2));
