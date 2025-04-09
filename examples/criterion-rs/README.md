# Rust Criterion example for benchmarking with `cargo bench`

-   [Workflow for this example](../../.github/workflows/criterion-rs.yml)

This directory shows how to use [`nyrkio/change-detection`](https://github.com/nyrkio/change-detection)
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
- name: Analyze benchmark results with Nyrkiö
  uses: nyrkio/change-detection@v1
  with:
      tool: 'cargo'
      output-file-path: output.txt
    nyrkio-token: ${{ secrets.NYRKIO_JWT_TOKEN }}
```

Please read ['How to use' section](https://github.com/nyrkio/change-detection#how-to-use) for common usage.
