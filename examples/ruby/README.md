Ruby example for benchmarking with [benchmark-ips][tool] and [benchmark-memory][memory-tool]
=============================================================================================

- [Workflow for this example](../../.github/workflows/ruby.yml)
- [Action log of this example](https://github.com/benchmark-action/github-action-benchmark/actions?query=workflow%3A%22Ruby+Example+with+benchmark-ips+and+benchmark-memory%22)
- [Benchmark results on GitHub pages](https://benchmark-action.github.io/github-action-benchmark/dev/bench/)

This directory shows how to use [`github-action-benchmark`](https://github.com/benchmark-action/github-action-benchmark)
with [benchmark-ips][tool] (`rubyruntime`) and [benchmark-memory][memory-tool] (`rubymemory`).

## Run benchmarks

Official documentation for usage of benchmark-ips:

https://github.com/evanphx/benchmark-ips

Add `benchmark-ips` to your `Gemfile`:

```ruby
gem 'benchmark-ips'
```

Prepare script `bench.rb` as follows:

e.g.

```ruby
require 'benchmark/ips'

Benchmark.ips do |x|
  x.report('some test case') do
    # ...
  end
end
```

benchmark-ips prints its results to stdout. This action extracts the iterations per second
from the "Calculating" section of that output. `x.compare!` and `:raw` format are also supported.
Since the measured value is iterations per second, a bigger value is better.

Run the script in workflow:

e.g.

```yaml
- name: Run benchmark
  run: bundle exec ruby bench.rb | tee output.txt
```

## Process benchmark results

Store the benchmark results with step using the action. Please set `rubyruntime` to `tool` input.

```yaml
- name: Store benchmark result
  uses: benchmark-action/github-action-benchmark@v1
  with:
    tool: 'rubyruntime'
    output-file-path: output.txt
```

Please read ['How to use' section](https://github.com/benchmark-action/github-action-benchmark#how-to-use) for common usage.

## Track memory with benchmark-memory

Add `benchmark-memory` to your `Gemfile`:

```ruby
gem 'benchmark-memory'
```

Prepare script `bench_memory.rb` as follows:

e.g.

```ruby
require 'benchmark/memory'

Benchmark.memory do |x|
  x.report('some test case') do
    # ...
  end
end
```

For each report, this action extracts six results from the output: allocated and retained
memsize (in bytes), objects and strings. Smaller values are better. Note that benchmark-memory
prints values with 3 decimal places and a k/M/B suffix, so large values are rounded (for example, `177.504k`).

Run the script and store the results with `rubymemory` set to `tool` input. Use a different `name`
from your benchmark-ips results, since each benchmark name is tied to one tool:

```yaml
- name: Run memory benchmark
  run: bundle exec ruby bench_memory.rb | tee memory_output.txt

- name: Store memory benchmark result
  uses: benchmark-action/github-action-benchmark@v1
  with:
    name: Memory Benchmark
    tool: 'rubymemory'
    output-file-path: memory_output.txt
```

[tool]: https://github.com/evanphx/benchmark-ips
[memory-tool]: https://github.com/michaelherold/benchmark-memory
