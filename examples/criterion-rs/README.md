# Rust Criterion example for benchmarking with `cargo bench`

-   [Workflow for this example](../../.github/workflows/criterion-rs.yml)
-   [Benchmark results on GitHub pages](https://benchmark-action.github.io/github-action-benchmark/dev/bench/)

This directory shows how to use [`github-action-benchmark`](https://github.com/benchmark-action/github-action-benchmark)
with [`criterion`](https://github.com/bheisler/criterion.rs).

## Run benchmarks

Official documentation for usage of `cargo bench` with Criterion:

https://github.com/bheisler/criterion.rs

e.g.

```yaml
- name: Run benchmark
  run: cargo bench -- --output-format bencher | tee output.txt
```

Note that you should run the benchmarks using the bencher output format.


## Process benchmark results

Store the benchmark results with step using the action. Please set `cargo` to `tool` input.

```yaml
- name: Store benchmark result
  uses: benchmark-action/github-action-benchmark@v1
  with:
      tool: 'cargo'
      output-file-path: output.txt
```

Please read ['How to use' section](https://github.com/benchmark-action/github-action-benchmark#how-to-use) for common usage.
