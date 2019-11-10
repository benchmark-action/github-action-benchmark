GitHub Action for Continuous Benchmarking
=========================================
[![Build Status][build-badge]][ci]

[This repository][proj] provides a [GitHub Action][github-action] for continuous benchmarking.
This action depends on nothing other than GitHub; it collects data from benchmark outputs and
writes them to [GitHub pages][gh-pages] branch while GitHub Action workflow. You can see the
visualized benchmark results in the GitHub pages of your project.

This action currently supports

- [`cargo bench`][cargo-bench] for Rust projects
- `go test -bench` for Go projects
- [benchmark.js][benchmarkjs] for JavaScript/TypeScript projects

Multiple languages in the same repository is supported for polyglot projects.

## Examples

Example projects for each languages are in [examples/](./examples) directory. Live example workflows
are in [.github/workflows/](./.github/workflows) directory. Workflow actions are:

- Rust: [![Rust Example Workflow][rust-badge]](https://github.com/rhysd/github-action-benchmark/actions?query=workflow%3A%22Rust+Example%22)
- Go: [![Go Example Workflow][go-badge]](https://github.com/rhysd/github-action-benchmark/actions?query=workflow%3A%22Go+Example%22)
- JavaScript: [![JavaScript Example Workflow][benchmarkjs-badge]](https://github.com/rhysd/github-action-benchmark/actions?query=workflow%3A%22Benchmark.js+Example%22)

All benchmark charts from above workflows are gathered in GitHub pages:

https://rhysd.github.io/github-action-benchmark/dev/bench/

![page screenshot](https://github.com/rhysd/ss/blob/master/github-action-benchmark/main.png?raw=true)

Mouse over on data point shows a tooltip. It includes

- Commit hash
- Commit message
- Date and committer
- Benchmark value

Clicking data point in chart opens the commit page on GitHub repository.

![tooltip](https://github.com/rhysd/ss/blob/master/github-action-benchmark/tooltip.png?raw=true)

At bottom of the page, download button is available for downloading benchmark results as JSON file.

![download button](https://github.com/rhysd/ss/blob/master/github-action-benchmark/download.png?raw=true)

## Why?

Since performance is important. Writing benchmarks is a very popular and correct way to visualize
a software performance. Benchmarks help us to keep performance and confirm effects of optimizations.
For keeping the performance, it's key to monitor the benchmark results for changes to the software.
To notice performance regression quickly, charts of benchmarking results are useful.

However, there is no good free tool to watch the performance easily and continuously (as far as I looked).
So I built a new tool on top of GitHub Action.

## How to use

This action takes a file which contains benchmark output and updates GitHub pages branch automatically.

### Basic usage

At first, please ensure that your benchmark workflow runs only on your branches. Please avoid `pull_request`
event otherwise anyone who creates a pull request on your repository can modify your GitHub pages branch.

e.g. Runs on only `master` branch

```yaml
on:
  push:
    branches:
      - master
```

Run your benchmarks on your workflow and store the output to a file. `tee` command is useful to output
results to both console and file.

e.g.

```yaml
- name: Run benchmark
  run: go test -bench 'Benchmark' | tee output.txt
```

Please add `rhysd/github-action-benchmark@{ver}` to your workflow yaml file.

e.g.

```yaml
- name: Store benchmark result
  uses: rhysd/github-action-benchmark@v1
  with:
    name: My Project Go Benchmark
    tool: 'go'
    output-file-path: output.txt
```

In the example, `name`, `tool`, `output-file-path` inputs are set and other inputs are set to default
values. Please read next section to know each input.

Above action step updates your GitHub pages branch automatically. By default it assumes `gh-pages`
branch. Please make it on your remote repository in advance.

Then push the branch to your remote.

e.g.

```yaml
- name: Push benchmark result
  run: git push 'https://you:${{ secrets.GITHUB_TOKEN }}@github.com/you/repo-name.git' gh-pages:gh-pages
```

This action does not push changes to remote automatically due to security reason. Action does not know
your GitHub API token automatically generated while running your workflows. So you need to push GitHub
pages branch by your own.

If you're lazy, you can use [github-push-action](https://github.com/ad-m/github-push-action) to push
the branch easily.

Note that GitHub pages branch and a directory to put benchmark results are customizable by inputs.

After first job execution, `https://you.github.io/dev/bench` should be available like
[examples of this repository][examples-page].

### Tool Specific Setup

Please read `README.md` files at each example directory.

- [`cargo bench` for Rust projects](./examples/rust/README.md)
- [`go test` for Go projects](./examples/go/README.md)
- [Benchmark.js for JavaScript/TypeScript projects](./examples/benchmarkjs/README.md)

These examples are run in workflows of this repository as described in 'Examples' section above.

### Action inputs

Input definitions are written in [action.yml](./action.yml).

| Name                      | Description                                                                                          | Type                                      | Required | Default       |
|---------------------------|------------------------------------------------------------------------------------------------------|-------------------------------------------|----------|---------------|
| `name`                    | Name of the benchmark. This value must be identical across all benchmarks in your repository.        | String                                    | Yes      | `"Benchmark"` |
| `tool`                    | Tool for running benchmark                                                                           | One of `"cargo"`, `"go"`, `"benchmarkjs"` | Yes      |               |
| `output-file-path`        | Path to file which contains the benchmark output. Relative to repository root                        | String                                    | Yes      |               |
| `gh-pages-branch`         | Name of your GitHub pages branch                                                                     | String                                    | Yes      | `"gh-pages"`  |
| `benchmark-data-dir-path` | Path to directory which contains benchmark files on GitHub pages branch. Relative to repository root | String                                    | Yes      | `"dev/bench"` |

`name` and `tool` must be specified in workflow at `uses` section of job step.

Other inputs have default values. By default, they assume that GitHub pages is hosted at `gh-pages`
branch and benchmark results are available at `https://you.github.io/repo-name/dev/bench`.

If you're using `docs/` directory of `master` branch for GitHub pages, please set `gh-pages-branch` to
`master` and `benchmark-data-dir-path` to directory under `docs` like `docs/dev/bench`.

### Customizing benchmarks result page

This action creates the default `index.html` in the directory specified with `benchmark-data-dir-path`
input. By default every benchmark test case has its own chart in the page. Charts are drawn with
[Chart.js](https://www.chartjs.org/).

If it does not fit to your use case, please modify it or replace it with your favorite one. Every
benchmark data is stored in `window.BENCHMARK_DATA` so you can create your favorite view.

### Versioning

This action conforms semantic versioning 2.0.

For example, `rhysd/github-action-benchmark@v1` means the latest version of `1.x.y`. And
`rhysd/github-action-benchmark@v1.0.2` always uses `v1.0.2` even if newer version is published.

`master` branch of this repository is for development and does not work as action.

## Future work

- Allow user defined benchmark tool
  - Accept benchmark result as an array of benchmark results as JSON. User can generate JSON file
    to integrate any benchmarking tool to this action
- Allow to upload results to metrics service such as [mackerel](https://mackerel.io/) instead of
  updating GitHub pages
- Support pull requests. Instead of updating GitHub pages, add comment to the pull request to explain
  benchmark result.

## License

[the MIT License](./LICENSE.txt)

[build-badge]: https://github.com/rhysd/github-action-benchmark/workflows/CI/badge.svg
[ci]: https://github.com/rhysd/github-action-benchmark/actions?query=workflow%3ACI
[proj]: https://github.com/rhysd/github-action-benchmark
[rust-badge]: https://github.com/rhysd/github-action-benchmark/workflows/Rust%20Example/badge.svg
[go-badge]: https://github.com/rhysd/github-action-benchmark/workflows/Go%20Example/badge.svg
[benchmarkjs-badge]: https://github.com/rhysd/github-action-benchmark/workflows/Benchmark.js%20Example/badge.svg
[github-action]: https://github.com/features/actions
[cargo-bench]: https://doc.rust-lang.org/cargo/commands/cargo-bench.html
[benchmarkjs]: https://benchmarkjs.com/
[gh-pages]: https://pages.github.com/
[examples-page]: https://rhysd.github.io/github-action-benchmark/dev/bench/
