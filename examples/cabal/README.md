Cabal example for benchmarking with `criterion`
=================================================

- [Workflow for this example](../../.github/workflows/cabal.yml)
- [Action log of this example](https://github.com/benchmark-action/github-action-benchmark/)
- [Benchmark results on GitHub pages](https://benchmark-action.github.io/github-action-benchmark/dev/bench/)

This directory shows how to use [`github-action-benchmark`](https://github.com/benchmark-action/github-action-benchmark)
with `criterion` package.

You can see a quick `criterion` tutorial [here](http://www.serpentine.com/criterion/tutorial.html).

NB: As for now, this GitHub action only supports benchmarks made with `criterion` package outputted as a .csv file.

## Run benchmarks

If the file with the benchmarks is also a "benchmark" according to your .cabal file, then

```yaml
- name: Run benchmark
  run: cabal bench --benchmark-options="--csv <FILENAME>"
```

should do the trick. If it is an "executable" (as it is in the example), then run it with

```yaml
- name: Run benchmark
  run: cabal run -- --csv <FILENAME>"
```

## Process benchmark results

Store the benchmark results with step using the action.

```yaml
- name: Store benchmark result
  uses: benchmark-action/github-action-benchmark@v1
  with:
    tool: 'cabal'
    output-file-path: <FILENAME>
```

Please read ['How to use' section](https://github.com/benchmark-action/github-action-benchmark#how-to-use) for common usage.
