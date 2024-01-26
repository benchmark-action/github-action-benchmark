# Rust example for benchmarking with `cargo bench`

- [Workflow for this example](../../.github/workflows/rust.yml)
- [Action log of this example](https://github.com/benchmark-action/github-action-benchmark/actions?query=workflow%3A%22Rust+Example%22)
- [Benchmark results on GitHub pages](https://benchmark-action.github.io/github-action-benchmark/dev/bench/)

This directory shows how to use [`github-action-benchmark`](https://github.com/benchmark-action/github-action-benchmark)
with [`cargo bench`](https://doc.rust-lang.org/cargo/commands/cargo-bench.html).

## Run benchmarks

Official documentation for usage of `cargo bench`:

https://doc.rust-lang.org/unstable-book/library-features/test.html

e.g.

```yaml
- name: Run benchmark
  run: cargo +nightly bench | tee output.txt
```

Note that `cargo bench` is available only with nightly toolchain.

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
  uses: benchmark-action/github-action-benchmark@v1
  with:
    tool: 'cargo'
    output-file-path: output.txt
```

Please read ['How to use' section](https://github.com/benchmark-action/github-action-benchmark#how-to-use) for common usage.

# Rust example for benchmarking with `cargo-criterion`

In the previous section, both regular and criterion-rs can be used through the regular `cargo bench` facility, but there's an additional crate and cargo extension named [`cargo-criterion`][cargo-criterion].

 The improvements in [cargo-criterion][cargo-criterion] do [match the goals of github-action-benchmark](https://crates.io/crates/cargo-criterion#goals), so it makes sense to include support for it.


## Run benchmarks

Official documentation for usage of `cargo criterion`:

https://bheisler.github.io/criterion.rs/book/cargo_criterion/cargo_criterion.html

.e.g: 

```yaml
- name: Run benchmarks 
  run: cargo criterion 1> output.json
```

If you have a group of benchmarks, cargo criterion will output a [ndJSON][ndjson].

## Process benchmarks results

There are two notable differences in cargo-criterion:

  1. Since the output is machine-readable JSON, the extract process only parses the result file and maps the required data into github-action-benchmark plotting system. In fact, [cargo-criterion][cargo-criterion] only supports JSON as `message-format` (output format).
  2. cargo-criterion incorporates [its own HTML benchmark reports system][criterion-rs-own-html], which can be stored alongside if desired through the `native-benchmark-data-dir-path`.

```yaml
- name: Store benchmark result
  uses: benchmark-action/github-action-benchmark@v1
  with:
    tool: 'cargo-criterion'
    output-file-path: output.json
    native-benchmark-data-dir-path: target/criterion
```

The native benchmark reports is simply copied from `target/criterion/reports` and pushed to the github results repo so that they are available under:

https://YOUR_ORG.github.io/YOUR_REPO/dev/bench/native/criterion/reports/

[cargo-criterion]: https://crates.io/crates/cargo-criterion
[criterion-rs-own-html]: https://bheisler.github.io/criterion.rs/book/user_guide/plots_and_graphs.html
[ndjson]: http://ndjson.org/