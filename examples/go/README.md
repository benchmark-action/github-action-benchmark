Go example for benchmarking with `go test -bench`
=================================================

- [Workflow for this example](../../.github/workflows/go.yml)
- [Action log of this example](https://github.com/nyrkio/change-detection/actions?query=workflow%3A%22Go+Example%22)

This directory shows how to use [`nyrkio/change-detection`](https://github.com/nyrkio/change-detection)
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
- name: Analyze benchmark results with Nyrkiö
  uses: nyrkio/change-detection@v2
  with:
    tool: 'go'
    output-file-path: output.txt
    nyrkio-token: ${{ secrets.NYRKIO_JWT_TOKEN }}
```

Please read ['How to use' section](https://github.com/nyrkio/change-detection#how-to-use) for common usage.
