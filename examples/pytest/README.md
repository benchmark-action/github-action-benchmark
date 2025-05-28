Python example for benchmarking with [pytest-benchmark][tool]
=============================================================

- [Workflow for this example](../../.github/workflows/pytest.yml)
- [Action log of this example](https://github.com/benchmark-action/github-action-benchmark/actions?query=workflow%3A%22Python+Example+with+pytest%22)
- [Benchmark results on GitHub pages](https://benchmark-action.github.io/github-action-benchmark/dev/bench/)

This directory shows how to use [`github-action-benchmark`](https://github.com/benchmark-action/github-action-benchmark)
with [pytest-benchmark][tool].

## Run benchmarks

Official documentation for usage of pytest-benchmark:

https://pytest-benchmark.readthedocs.io/en/stable/

Install dependencies with `venv` package using Python3.

```sh
$ python -m venv venv
$ source venv/bin/activate
$ pip install pytest pytest-benchmark
```

Prepare `bench.py` as follows:

e.g.

```python
import pytest

def some_test_case(benchmark):
    benchmark(some_func, args)
```

And run benchmarks with `--benchmark-json` in workflow. The JSON file will be an input to
github-action-benchmark.

e.g.

```yaml
- name: Run benchmark
  run: pytest bench.py --benchmark-json output.json
```

## Process benchmark results

Store the benchmark results with step using the action. Please set `pytest` to `tool` input.

```yaml
- name: Analyze benchmark results with Nyrkiö
  uses: nyrkio/change-detection@v2
  with:
    tool: 'pytest'
    output-file-path: output.json
    nyrkio-token: ${{ secrets.NYRKIO_JWT_TOKEN }}
```

Please read ['How to use' section](https://github.com/nyrkio/change-detection#how-to-use) for common usage.

[tool]: https://pypi.org/project/pytest-benchmark/
