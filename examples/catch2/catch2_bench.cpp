#include "fib.hpp"
#include <catch2/catch_test_macros.hpp>
#include <catch2/benchmark/catch_benchmark.hpp>

TEST_CASE("Fibonacci") {

  // now let's benchmark:
  BENCHMARK("Fibonacci 10") { return fib(10); };

  BENCHMARK("Fibonacci 20") { return fib(20); };
}
