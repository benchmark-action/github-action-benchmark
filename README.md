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
- [pytest-benchmark][] for Python projects with [pytest][]

Multiple languages in the same repository is supported for polyglot projects.

[Japanese Blog post](https://rhysd.hatenablog.com/entry/2019/11/11/131505)

## Examples

Example projects for each languages are in [examples/](./examples) directory. Live example workflows
are in [.github/workflows/](./.github/workflows) directory. Workflow actions are:

- Rust: [![Rust Example Workflow][rust-badge]](https://github.com/rhysd/github-action-benchmark/actions?query=workflow%3A%22Rust+Example%22)
- Go: [![Go Example Workflow][go-badge]](https://github.com/rhysd/github-action-benchmark/actions?query=workflow%3A%22Go+Example%22)
- JavaScript: [![JavaScript Example Workflow][benchmarkjs-badge]](https://github.com/rhysd/github-action-benchmark/actions?query=workflow%3A%22Benchmark.js+Example%22)
- Python (pytest-benchmark): [![Pytest Example Workflow][pytest-benchmark-badge]](https://github.com/rhysd/github-action-benchmark/actions?query=workflow%3A%22Python+Example+with+pytest-benchmark%22)

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

As of now, [deploying GitHub Pages branch fails with `$GITHUB_TOKEN` automatically generated for workflows](https://github.community/t5/GitHub-Actions/Github-action-not-triggering-gh-pages-upon-push/td-p/26869).
`$GITHUB_TOKEN` can push branch to remote, but building GitHub Pages fails. Please read [issue #1](https://github.com/rhysd/github-action-benchmark/issues/1)
for more details.

To avoid this issue for now, you need to create your personal access token.

1. Go to your user settings page
2. Enter 'Developer settings' tab
3. Enter 'Personal access tokens' tab
4. Click 'Generate new token' and enter your favorite token name
5. Check `public_repo` scope for `git push` and click 'Generate token' at bottom
6. Go to your repository settings page
7. Enter 'Secrets' tab
8. Create new `PERSONAL_GITHUB_TOKEN` secret with generated token string

This is a current limitation only for public repositories. For private repository, `secrets.GITHUB_TOKEN`
is available. In the future, this issue would be resolved and we could simply use `$GITHUB_TOKEN` to
deploy GitHub Pages branch. Let's back to workflow YAML file.

There are two options for pushing GitHub pages branch to remote from workflow.

1. Give your API token to `github-token` input and set `auto-push` to `true`
2. Add step for executing `git push` within workflow

#### 1. Give your API token to `github-token` input and set `auto-push` to `true`

e.g.

```yaml
- name: Store benchmark result
  uses: rhysd/github-action-benchmark@v1
  with:
    name: My Project Go Benchmark
    tool: 'go'
    output-file-path: output.txt
    github-token: ${{ secrets.PERSONAL_GITHUB_TOKEN }}
    auto-push: true
```

Just after generating a commit to update benchmark results, github-action-benchmark pushes the commit
to GitHub Pages branch. As a bonus, this action pulls the branch before generating a commit. It helps
to avoid conflicts among multiple workflows which deploy GitHub pages branch.

#### 2. Add step for executing `git push` within workflow

e.g.

```yaml
- name: Push benchmark result
  run: git push 'https://you:${{ secrets.PERSONAL_GITHUB_TOKEN }}@github.com/you/repo-name.git' gh-pages:gh-pages
```

If you don't set `auto-push` input, this action does not push changes to remote automatically. This
might be an option if you don't want to give API token to this action. Instead, So you need to push
GitHub pages branch by your own.

Note that GitHub pages branch and a directory to put benchmark results are customizable by inputs.

After first job execution, `https://you.github.io/dev/bench` should be available like
[examples of this repository][examples-page].

### Tool Specific Setup

Please read `README.md` files at each example directory.

- [`cargo bench` for Rust projects](./examples/rust/README.md)
- [`go test` for Go projects](./examples/go/README.md)
- [Benchmark.js for JavaScript/TypeScript projects](./examples/benchmarkjs/README.md)
- [pytest-benchmark for Python projects with pytest](./examples/pytest/README.md)

These examples are run in workflows of this repository as described in 'Examples' section above.

### Action inputs

Input definitions are written in [action.yml](./action.yml).

| Name                      | Description                                                                                          | Type                                                  | Required | Default       |
|---------------------------|------------------------------------------------------------------------------------------------------|-------------------------------------------------------|----------|---------------|
| `name`                    | Name of the benchmark. This value must be identical across all benchmarks in your repository.        | String                                                | Yes      | `"Benchmark"` |
| `tool`                    | Tool for running benchmark                                                                           | One of `"cargo"`, `"go"`, `"benchmarkjs"`, `"pytest"` | Yes      |               |
| `output-file-path`        | Path to file which contains the benchmark output. Relative to repository root                        | String                                                | Yes      |               |
| `gh-pages-branch`         | Name of your GitHub pages branch                                                                     | String                                                | Yes      | `"gh-pages"`  |
| `benchmark-data-dir-path` | Path to directory which contains benchmark files on GitHub pages branch. Relative to repository root | String                                                | Yes      | `"dev/bench"` |
| `github-token`            | GitHub API token. For public repo, personal access token is necessary. Please see basic usage        | String                                                | No       |               |
| `auto-push`               | If set to `true`, this action automatically pushes generated commit to GitHub Pages branch           | Boolean                                               | No       | `false`       |

`name` and `tool` must be specified in workflow at `uses` section of job step.

Other inputs have default values. By default, they assume that GitHub pages is hosted at `gh-pages`
branch and benchmark results are available at `https://you.github.io/repo-name/dev/bench`.

If you're using `docs/` directory of `master` branch for GitHub pages, please set `gh-pages-branch` to
`master` and `benchmark-data-dir-path` to directory under `docs` like `docs/dev/bench`.

### Caveats

#### Run only on your branches

Please ensure that your benchmark workflow runs only on your branches. Please avoid running it on
pull requests. If branch were pushed to GitHub pages branch on pull request, anyone who creates a
pull request on your repository could modify your GitHub pages branch.

For this, you can specify branch which runs your benchmark workflow on `on:` section. Or set proper
condition to `if:` section of step which pushes GitHub pages.

e.g. Runs on only `master` branch

```yaml
on:
  push:
    branches:
      - master
```

e.g. Push when not running for pull request

```yaml
- name: Push benchmark result
  run: git push ...
  if: github.event_name != 'pull_request'
```

#### Stability of Virtual Environment

As far as watching the benchmark results of examples in this repository, amplitude of the benchmarks
is about +- 10~20%. If your benchmarks use some resources such as networks or file I/O, the amplitude
might be bigger.

If the amplitude is not acceptable, please prepare a stable environment to run benchmarks.
GitHub action supports [self-hosted runners](https://help.github.com/en/actions/automating-your-workflow-with-github-actions/about-self-hosted-runners).

### Customizing benchmarks result page

This action creates the default `index.html` in the directory specified with `benchmark-data-dir-path`
input. By default every benchmark test case has its own chart in the page. Charts are drawn with
[Chart.js](https://www.chartjs.org/).

If it does not fit to your use case, please modify the HTML file or replace it with your favorite one.
Every benchmark data is stored in `window.BENCHMARK_DATA` so you can create your favorite view.

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
- Add an alert comment to commit page when the benchmark result of the commit is far worse than
  previous one.
- Add more benchmark tools:
  - [Google's C++ Benchmark framework](https://github.com/google/benchmark)
  - [airspeed-velocity Python benchmarking tool](https://github.com/airspeed-velocity/asv)

## License

[the MIT License](./LICENSE.txt)

[build-badge]: https://github.com/rhysd/github-action-benchmark/workflows/CI/badge.svg
[ci]: https://github.com/rhysd/github-action-benchmark/actions?query=workflow%3ACI
[proj]: https://github.com/rhysd/github-action-benchmark
[rust-badge]: https://github.com/rhysd/github-action-benchmark/workflows/Rust%20Example/badge.svg
[go-badge]: https://github.com/rhysd/github-action-benchmark/workflows/Go%20Example/badge.svg
[benchmarkjs-badge]: https://github.com/rhysd/github-action-benchmark/workflows/Benchmark.js%20Example/badge.svg
[pytest-benchmark-badge]: https://github.com/rhysd/github-action-benchmark/workflows/Python%20Example%20with%20pytest-benchmark/badge.svg
[github-action]: https://github.com/features/actions
[cargo-bench]: https://doc.rust-lang.org/cargo/commands/cargo-bench.html
[benchmarkjs]: https://benchmarkjs.com/
[gh-pages]: https://pages.github.com/
[examples-page]: https://rhysd.github.io/github-action-benchmark/dev/bench/
[pytest-benchmark]: https://pypi.org/project/pytest-benchmark/
[pytest]: https://pypi.org/project/pytest/
