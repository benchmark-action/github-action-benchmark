#include "fib.hpp"
#define CATCH_CONFIG_MAIN
#include <catch2/catch.hpp>

TEST_CASE("Fibonacci") {

  // now let's benchmark:
  BENCHMARK("Fibonacci 10") { return fib(10); };

  BENCHMARK("Fibonacci 20") { return fib(20); };
}
