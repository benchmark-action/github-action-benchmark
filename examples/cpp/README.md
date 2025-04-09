C++ example for benchmarking with [Google Benchmark Framework][tool]
====================================================================

- [Workflow for this example](../../.github/workflows/cpp.yml)
- [Action log of this example](https://github.com/nyrkio/change-detection/actions?query=workflow%3A%22C%2B%2B+Example%22)

This directory shows how to use [`change-detection`][action] with [Google Benchmark Framework][tool].

## Run benchmarks

Official documentation for usage of Google Benchmark Framework:

https://github.com/google/benchmark

Build and install `benchmark` library and write up your benchmark suites following instructions in
the above repository:

```cpp
#include "benchmark/benchmark.h"

static void bench1(benchmark::State &state) {
  for (auto _ : state) {
    // Your benchmark goes here
  }
}

// Register the function as a benchmark
BENCHMARK(bench1);

// Run the benchmark
BENCHMARK_MAIN();
```

Build the source with C++ compiler:

```sh
$ clang++ -std=c++14 -O3 -l benchmark bench.cpp
```

And run built executable to output the result in JSON format:

```sh
$ ./a.out --benchmark_format=json | tee benchmark_result.json
```

## Process benchmark results

Store the benchmark results with step using the action. Please set `googlecpp` to `tool` input.

```yaml
- name: Analyze benchmark results with Nyrkiö
  uses: nyrkio/change-detection@v1
  with:
    tool: 'pytest'
    tool: 'googlecpp'
    output-file-path: benchmark_result.json
    nyrkio-token: ${{ secrets.NYRKIO_JWT_TOKEN }}
```

Please read ['How to use' section](https://github.com/nyrkio/change-detection#how-to-use) for common usage.

## Run this example

To try this example, please use [make](./Makefile) and `clang++`.

```sh
$ make bench
```

`bench` subcommand prepares all dependencies, compiles `bench.cpp` and runs benchmarks. The results
are output to console.

```
2019-11-29 21:13:55
Running ./a.out
Run on (4 X 2700 MHz CPU s)
CPU Caches:
  L1 Data 32K (x2)
  L1 Instruction 32K (x2)
  L2 Unified 262K (x2)
  L3 Unified 3145K (x1)
Load Average: 1.66, 1.98, 2.49
-----------------------------------------------------
Benchmark           Time             CPU   Iterations
-----------------------------------------------------
fib_10            210 ns          210 ns      3239181
fib_20          27857 ns        27786 ns        25206
```

To get JSON output for running [nyrkio/change-detection][action], please use another subcommand.

```sh
$ make json
```

`json` subcommand outputs the benchmark results in JSON format and generates `benchmark_result.json`
file in current directory.

[tool]: https://github.com/google/benchmark
[action]: https://github.com/nyrkio/change-detection
