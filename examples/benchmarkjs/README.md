JavaScript example for benchmarking with [benchmark.js][tool]
=============================================================

- [Workflow for this example](../../.github/workflows/benchmarkjs.yml)
- [Action log of this example](https://github.com/benchmark-action/github-action-benchmark/actions?query=workflow%3A%22Benchmark.js+Example%22)
- [Benchmark results on GitHub pages](https://benchmark-action.github.io/github-action-benchmark/dev/bench/)

This directory shows how to use [`github-action-benchmark`](https://github.com/benchmark-action/github-action-benchmark)
with [benchmark.js][tool].

## Run benchmarks

Official documentation for usage of benchmark.js:

https://benchmarkjs.com/

Prepare script `bench.js` as follows:

e.g.

```javascript
const Benchmark = require('benchmark');
const suite = new Benchmark.Suite();

suite
    .add('some test case', () => {
        // ...
    })
    .on('cycle', event => {
        // Output benchmark result by converting benchmark result to string
        console.log(String(event.target));
    })
    .run();
```

Ensure the output includes string values converted from benchmark results.
This action extracts measured values fron the output.

Run the script in workflow:

e.g.

```yaml
- name: Run benchmark
  run: node bench.js | tee output.txt
```

## Process benchmark results

Store the benchmark results with step using the action. Please set `benchmarkjs` to `tool` input.

```yaml
- name: Store benchmark result
  uses: benchmark-action/github-action-benchmark@v1
  with:
    tool: 'benchmarkjs'
    output-file-path: output.txt
```

Please read ['How to use' section](https://github.com/benchmark-action/github-action-benchmark#how-to-use) for common usage.

[tool]: https://benchmarkjs.com/
