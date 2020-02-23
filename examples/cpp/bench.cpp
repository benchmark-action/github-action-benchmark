#include "./fib.hpp"
#include "benchmark/benchmark.h"

static void fib_10(benchmark::State &state) {
  for (auto _ : state) {
    // Suppress optimization otherwise this line is removed by DCE
    int i = 10;
    benchmark::DoNotOptimize(i);
    benchmark::DoNotOptimize(fib(i));
  }
}

static void fib_20(benchmark::State &state) {
  for (auto _ : state) {
    int i = 20;
    benchmark::DoNotOptimize(i);
    benchmark::DoNotOptimize(fib(i));
  }
}

// Register the function as a benchmark
BENCHMARK(fib_10);
BENCHMARK(fib_20);

// Run the benchmark
BENCHMARK_MAIN();
