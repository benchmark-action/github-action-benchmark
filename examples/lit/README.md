# lit - LLVM Integrated Tester Example

- [lit docs](https://llvm.org/docs/CommandGuide/lit.html)
- [Workflow for this example](../../.github/workflows/lit.yml)

This directory shows how to use [`github-action-benchmark`](https://github.com/benchmark-action/github-action-benchmark)
with [lit](https://llvm.org/docs/CommandGuide/lit.html).

## Run benchmarks

Install dependencies with `venv` package using Python3.

```sh
$ python -m venv venv
$ source venv/bin/activate
$ pip install lit
```

Setup your test suite. In this example it consists of a configuration file for lit `lit.cfg` and two tests `a.txt` and `b.txt` containing one RUN line each.

e.g

```python
import lit.formats

config.name = "time-tests"
config.suffixes = [".txt"]
config.test_format = lit.formats.ShTest()
config.test_source_root = None
config.test_exec_root = None
```

```
# RUN: true
```

```
# RUN: sleep 1
```

And run the test suite with `--resultdb-output` in workflow. The JSON file will be an input to github-action-benchmark.

e.g.

```yaml
- name: Run benchmark
  run: lit examples/lit --resultdb-output output.json
```

## Process benchmark results

Store the benchmark results with step using the action. Please set `tool` to `lit` input and pass the path to the output file.

```yaml
- name: Store benchmark result
  uses: benchmark-action/github-action-benchmark@v1
  with:
    tool: 'lit'
    output-file-path: output.json
```

Please read ['How to use' section](https://github.com/benchmark-action/github-action-benchmark#how-to-use) for common usage.