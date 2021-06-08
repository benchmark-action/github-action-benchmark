Node.js example for benchmarking with the [JS performance API](https://developer.mozilla.org/docs/Web/API/Performance)
======================================================================================================================

- [Workflow for this example](../../.github/workflows/jsperformanceentry.yml)
- [Action log of this example](#TODO)
- [Benchmark results on GitHub pages](#TODO)

This directory shows how to use [`github-action-benchmark`](https://github.com/rhysd/github-action-benchmark)
with [JS performance API](https://developer.mozilla.org/docs/Web/API/Performance).

## Run benchmarks

Documentation for usage of the performance API:

- In a browser context: https://developer.mozilla.org/docs/Web/API/Performance
- In a Node.js context: https://nodejs.org/api/perf_hooks.html

Prepare script `bench.js` as follows:

e.g.

```javascript

performance.mark('start');

functionToBenchmark(25);

performance.mark('end');
performance.measure('eventName', 'start', 'end');

const entries = JSON.stringify(performance.getEntriesByType('measure'));
console.log(entries);
```

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
  uses: rhysd/github-action-benchmark@v1
  with:
    tool: 'benchmarkjs'
    output-file-path: output.txt
```

Please read ['How to use' section](https://github.com/rhysd/github-action-benchmark#how-to-use) for common usage.