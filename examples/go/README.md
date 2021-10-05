Go example for benchmarking with `go test -bench`
=================================================

- [Workflow for this example](../../.github/workflows/go.yml)
- [Action log of this example](https://github.com/benchmark-action/github-action-benchmark/actions?query=workflow%3A%22Go+Example%22)
- [Benchmark results on GitHub pages](https://benchmark-action.github.io/github-action-benchmark/dev/bench/)

This directory shows how to use [`github-action-benchmark`](https://github.com/benchmark-action/github-action-benchmark)
with `go test -bench` command.

## Run benchmarks

Official documentation for usage of `go test -bench`:

https://pkg.go.dev/testing#hdr-Benchmarks

e.g.

```yaml
- name: Run benchmark
  run: go test -bench 'Benchmark' | tee output.txt
```

## Process benchmark results

Store the benchmark results with step using the action. Please set `go` to `tool` input.

```yaml
- name: Store benchmark result
  uses: benchmark-action/github-action-benchmark@v1
  with:
    tool: 'go'
    output-file-path: output.txt
```

Please read ['How to use' section](https://github.com/benchmark-action/github-action-benchmark#how-to-use) for common usage.
