# Rust Criterion example for benchmarking with `cargo bench`

-   [Workflow for this example](../../.github/workflows/rust.yml)
-   [Action log of this example](https://github.com/rhysd/github-action-benchmark/actions?query=workflow%3A%22Rust+Example%22)
-   [Benchmark results on GitHub pages](https://rhysd.github.io/github-action-benchmark/dev/bench/)

This directory shows how to use [`github-action-benchmark`](https://github.com/rhysd/github-action-benchmark)
with [`criterion`](https://github.com/bheisler/criterion.rs).

## Run benchmarks

Official documentation for usage of `cargo bench` with Criterion:

https://github.com/bheisler/criterion.rs

e.g.

```yaml
- name: Run benchmark
  run: cargo +nightly bench | tee output.txt
```

Note that this example does not use LTO for benchmarking because entire code in benchmark iteration
will be removed as dead code. For normal use case, please enable it in `Cargo.toml` for production
performance.

```yaml
[profile.bench]
lto = true
```

## Process benchmark results

Store the benchmark results with step using the action. Please set `cargo` to `tool` input.

```yaml
- name: Store benchmark result
  uses: rhysd/github-action-benchmark@v1
  with:
      tool: 'cargo'
      output-file-path: output.txt
```

Please read ['How to use' section](https://github.com/rhysd/github-action-benchmark#how-to-use) for common usage.
