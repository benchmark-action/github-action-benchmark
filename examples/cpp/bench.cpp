#include "./fib.hpp"
#include "benchmark/benchmark.h"

static void fib_10(benchmark::State &state) {
  for (auto _ : state) {
    // Suppress optimization otherwise this line is removed by DCE
    benchmark::DoNotOptimize(fib(10));
  }
}

static void fib_20(benchmark::State &state) {
  for (auto _ : state) {
    benchmark::DoNotOptimize(fib(20));
  }
}

// Register the function as a benchmark
BENCHMARK(fib_10);
BENCHMARK(fib_20);

// Run the benchmark
BENCHMARK_MAIN();
