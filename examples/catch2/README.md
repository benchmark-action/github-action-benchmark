C++ example for benchmarking with [Catch2 Framework][tool]
====================================================================

- [Workflow for this example](../../.github/workflows/catch2.yml)
- [Action log of this example](https://github.com/nyrkio/change-detection/actions?query=workflow%3A%22Catch2+C%2B%2B+Example%22)

This directory shows how to use [`nyrkio/change-detection`][action] with [Catch2 Framework][tool].



## Run benchmarks

Official documentation for usage of Catch2 Framework can be found in its repository:

https://github.com/catchorg/Catch2

Since Catch2 is a header-only test framework, you don't need to build it in advance.
Download and put the headers in your `include` directory and write your benchmarks.

```cpp
#define CATCH_CONFIG_MAIN
#include <catch2/catch.hpp>

TEST_CASE("Fibonacci") {
  // now let's benchmark:
  BENCHMARK("Some benchmark") {
      // Your benchmark goes here
  };
}
```

Build the source with C++ compiler and run the built executable to get the benchmark output.
Ensure to use `console` reporter for this. `xml` reporter may be supported in the future.



## Process benchmark results

Store the benchmark results with step using the action. Please set `catch2` to `tool` input.

```yaml
- name: Analyze benchmark results with Nyrkiö
  uses: nyrkio/change-detection@v1
  with:
    tool: 'catch2'
    output-file-path: benchmark_result.json
    nyrkio-token: ${{ secrets.NYRKIO_JWT_TOKEN }}
```

Please read ['How to use' section](https://github.com/nyrkio/change-detection#how-to-use) for common usage.



## Run this example

To try this example, please use [cmake](./CMakeLists.txt) and `clang++`.

```sh
$ mkdir build
$ cd build
$ cmake -DCMAKE_BUILD_TYPE=Release ..
$ cmake --build . --config Release
```

This will create `Catch2_bench` executable. The results are output to stdout.

[tool]: https://github.com/catchorg/Catch2
[action]: https://github.com/nyrkio/change-detection
