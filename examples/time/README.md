Example for parsing output of the `time` CLI utility
====================================================

- [Workflow for this example](../../.github/workflows/time.yml)
- [Action log of this example](https://github.com/benchmark-action/github-action-benchmark/actions?query=workflow%3A%22Rust+Example%22)
- [Benchmark results on GitHub pages](https://benchmark-action.github.io/github-action-benchmark/dev/bench/)

This directory shows how to use [`github-action-benchmark`](https://github.com/benchmark-action/github-action-benchmark)
with [`cargo bench`](https://doc.rust-lang.org/cargo/commands/cargo-bench.html).

## Run benchmarks

Official documentation for usage of `time`:

https://man7.org/linux/man-pages/man1/time.1.html

So to run a benchmark, simply call time first:

```yaml
- name: Measure execution time with `time`
  run: (time (head --bytes=1000000000 /dev/random  >/dev/null)) 2>&1 | tee output.txt
```

Note the `2>&1` too capture also stderr output. By default that's where `time` will direct its output.


## Process benchmark results

Store the benchmark results with step using the action. Please set `cargo` to `tool` input.

```yaml
- name: Store benchmark result
  uses: benchmark-action/github-action-benchmark@v1
  with:
    tool: 'time'
    output-file-path: output.txt
```

Please read ['How to use' section](https://github.com/benchmark-action/github-action-benchmark#how-to-use) for common usage.


