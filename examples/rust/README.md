Rust example for benchmarking with `cargo bench`
================================================

- [Workflow for this example](../../.github/workflows/rust.yml)
- [Action log of this example](https://github.com/nyrkio/change-detection/actions?query=workflow%3A%22Rust+Example%22)

This directory shows how to use [`nyrkio/change-detection`](https://github.com/nyrkio/change-detection)
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
- name: Analyze benchmark results with Nyrkiö
  uses: nyrkio/change-detection@v1
  with:
    tool: 'cargo'
    output-file-path: output.txt
    nyrkio-token: ${{ secrets.NYRKIO_JWT_TOKEN }}
```

Please read ['How to use' section](https://github.com/nyrkio/change-detection#how-to-use) for common usage.


