Crystal example for benchmarking with `crystal run --release bench.cr`
=================================================

- [Workflow for this example](../../.github/workflows/crystal.yml)
- [Action log of this example](https://github.com/benchmark-action/github-action-benchmark/actions?query=workflow%3A%22Crystal+Example%22)
- [Benchmark results on GitHub pages](https://benchmark-action.github.io/github-action-benchmark/dev/bench/)

This directory shows how to use [`github-action-benchmark`](https://github.com/benchmark-action/github-action-benchmark)
with `crystal` command.

## Run benchmarks

Prepare benchmarks as follows:

e.g. `bench.cr`:

```crystal
require "benchmark"

def some_func
  # Your code to benchmark
end

Benchmark.ips do |x|
  x.report("some_func") { some_func }
  x.compare!
end
```

## Process benchmark results

Store the benchmark results with step using the action. Please set `crystal` to `tool` input.

```yaml
- name: Store benchmark result
  uses: benchmark-action/github-action-benchmark@v1
  with:
    tool: 'crystal'
    output-file-path: output.txt
```

Please read ['How to use' section](https://github.com/benchmark-action/github-action-benchmark#how-to-use) for common usage.
