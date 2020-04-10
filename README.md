GitHub Action for Continuous Benchmarking
=========================================
[![Action Marketplace][release-badge]][marketplace]
[![Build Status][build-badge]][ci]
[![codecov][codecov-badge]][codecov]

[This repository][proj] provides a [GitHub Action][github-action] for continuous benchmarking.
If your project has some benchmark suites, this action collects data from the benchmark outputs
and monitor the results on GitHub Actions workflow.

- This action can store collected benchmark results in [GitHub pages][gh-pages] branch and provide
  a chart view. Benchmark results are visualized on the GitHub pages of your project.
- This action can detect possible performance regressions by comparing benchmark results. When
  benchmark results get worse than previous exceeding the specified threshold, it can raise an alert
  via commit comment or workflow failure.

This action currently supports the following tools:

- [`cargo bench`][cargo-bench] for Rust projects
- `go test -bench` for Go projects
- [benchmark.js][benchmarkjs] for JavaScript/TypeScript projects
- [pytest-benchmark][] for Python projects with [pytest][]
- [Google Benchmark Framework][google-benchmark] for C++ projects
- [Catch2][catch2] for C++ projects

Multiple languages in the same repository are supported for polyglot projects.

[Japanese Blog post](https://rhysd.hatenablog.com/entry/2019/11/11/131505)



## Examples

Example projects for each language are in [examples/](./examples) directory. Live example workflow
definitions are in [.github/workflows/](./.github/workflows) directory. Live workflows are:

| Language     | Workflow                                                                                | Example Project                                |
|--------------|-----------------------------------------------------------------------------------------|------------------------------------------------|
| Rust         | [![Rust Example Workflow][rust-badge]][rust-workflow-example]                           | [examples/rust](./examples/rust)               |
| Go           | [![Go Example Workflow][go-badge]][go-workflow-example]                                 | [examples/go](./examples/go)                   |
| JavaScript   | [![JavaScript Example Workflow][benchmarkjs-badge]][benchmarkjs-workflow-example]       | [examples/benchmarkjs](./examples/benchmarkjs) |
| Python       | [![pytest-benchmark Example Workflow][pytest-benchmark-badge]][pytest-workflow-example] | [examples/pytest](./examples/pytest)           |
| C++          | [![C++ Example Workflow][cpp-badge]][cpp-workflow-example]                              | [examples/cpp](./examples/cpp)                 |
| C++ (Catch2) | [![C++ Catch2 Example Workflow][catch2-badge]][catch2-workflow-example]                 | [examples/catch2](./examples/catch2)           |

All benchmark charts from above workflows are gathered in GitHub pages:

https://rhysd.github.io/github-action-benchmark/dev/bench/



## Screenshots

### Charts on GitHub Pages

![page screenshot](https://github.com/rhysd/ss/blob/master/github-action-benchmark/main.png?raw=true)

Mouseover on data point shows a tooltip. It includes

- Commit hash
- Commit message
- Date and committer
- Benchmark value

Clicking data point in chart opens the commit page on a GitHub repository.

![tooltip](https://github.com/rhysd/ss/blob/master/github-action-benchmark/tooltip.png?raw=true)

At bottom of the page, the download button is available for downloading benchmark results as a JSON file.

![download button](https://github.com/rhysd/ss/blob/master/github-action-benchmark/download.png?raw=true)


### Alert comment on commit page

This action can raise [an alert comment][alert-comment-example]. to the commit when its benchmark
results are worse than previous exceeding a specified threshold.

![alert comment](https://github.com/rhysd/ss/blob/master/github-action-benchmark/alert-comment.png?raw=true)



## Why?

Since performance is important. Writing benchmarks is a popular and correct way to visualize a software
performance. Benchmarks help us to keep performance and to confirm the effects of optimizations.
For keeping the performance, it's important to monitor the benchmark results along with changes to
the software. To notice performance regression quickly, it's useful to monitor benchmarking results
continuously.

However, there is no good free tool to watch the performance easily and continuously across languages
(as far as I looked into). So I built a new tool on top of GitHub Actions.



## How to use

This action takes a file that contains benchmark output. And it outputs the results to GitHub Pages
branch and/or alert commit comment.


### Minimal setup

Let's start with a minimal workflow setup. For explanation, here let's say we have a Go project. But basic
setup is the same when you use other languages. For language-specific setup, please read the later section.

```yaml
name: Minimal setup
on:
  push:
    branches:
      - master

jobs:
  benchmark:
    name: Performance regression check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-go@v1
      # Run benchmark with `go test -bench` and stores the output to a file
      - name: Run benchmark
        run: go test -bench 'BenchmarkFib' | tee output.txt
      # Download previous benchmark result from cache (if exists)
      - name: Download previous benchmark data
        uses: actions/cache@v1
        with:
          path: ./cache
          key: ${{ runner.os }}-benchmark
      # Run `github-action-benchmark` action
      - name: Store benchmark result
        uses: rhysd/github-action-benchmark@v1
        with:
          # What benchmark tool the output.txt came from
          tool: 'go'
          # Where the output from the benchmark tool is stored
          output-file-path: output.txt
          # Where the previous data file is stored
          external-data-json-path: ./cache/benchmark-data.json
          # Workflow will fail when an alert happens
          fail-on-alert: true
      # Upload the updated cache file for the next job by actions/cache
```

The step which runs `github-action-benchmark` does followings:

1. Extract benchmark result from the output in `output.txt`
2. Update the downloaded cache file with the extracted result
3. Compare the result with the previous result. If it gets worse than previous exceeding 200% threshold,
   the workflow fails and the failure is notified to you

By default, this action marks the result as performance regression when it is worse than the previous
exceeding 200% threshold. For example, if the previous benchmark result was 100 iter/ns and this time
it is 230 iter/ns, it means 230% worse than the previous and an alert will happen. The threshold can
be changed by `alert-threshold` input.

A live workflow example is [here](.github/workflows/minimal.yml). And the results of the workflow can
be seen [here][minimal-workflow-example].


### Commit comment

In addition to the above setup, GitHub API token needs to be given to enable `comment-on-alert` feature.

```yaml
- name: Store benchmark result
  uses: rhysd/github-action-benchmark@v1
  with:
    tool: 'go'
    output-file-path: output.txt
    external-data-json-path: ./cache/benchmark-data.json
    fail-on-alert: true
    # GitHub API token to make a commit comment
    github-token: ${{ secrets.GITHUB_TOKEN }}
    # Enable alert commit comment
    comment-on-alert: true
    # Mention @rhysd in the commit comment
    alert-comment-cc-users: '@rhysd'
```

`secrets.GITHUB_TOKEN` is [a GitHub API token automatically generated for each workflow run][help-github-token].
It is necessary to send a commit comment when the benchmark result of the commit is detected as possible
performance regression.

Now, in addition to making workflow fail, the step leaves a commit comment when it detects performance
regression [like this][alert-comment-example]. Though `alert-comment-cc-users` input is not mandatory for
this, I recommend to set it to make sure you can notice the comment via GitHub notification. Please note
that this value must be quoted like `'@rhysd'` because [`@` is an indicator in YAML syntax](https://yaml.org/spec/1.2/spec.html#id2772075).

A live workflow example is [here](.github/workflows/commit-comment.yml). And the results of the workflow
can be seen [here][commit-comment-workflow-example].


### Charts on GitHub Pages

It is useful to see how the benchmark results changed on each change in time-series charts. This action
provides a chart dashboard on GitHub pages.

It requires some preparations before the workflow setup.

At first, you need to create a branch for GitHub Pages if you haven't created it yet.

```sh
# Create a local branch
$ git checkout --orphan gh-pages
# Push it to create a remote branch
$ git push origin gh-pages:gh-pages
```

Second, you need to [create a personal access token][help-personal-access-token]. As of now,
[deploying a GitHub Pages branch fails with `$GITHUB_TOKEN` automatically generated for workflows](https://github.community/t5/GitHub-Actions/Github-action-not-triggering-gh-pages-upon-push/td-p/26869).
`$GITHUB_TOKEN` can push a branch to remote, but building GitHub Pages fails. Please read
[issue #1](https://github.com/rhysd/github-action-benchmark/issues/1) for more details.
This is a current limitation only for public repositories. For private repository, `secrets.GITHUB_TOKEN`
is available. In the future, this issue would be resolved and we could simply use `$GITHUB_TOKEN` to
deploy a GitHub Pages branch.

1. Go to your user settings page
2. Enter 'Developer settings' tab
3. Enter 'Personal access tokens' tab
4. Click 'Generate new token' and enter your favorite token name
5. Check `repo` scope for `git push` and click 'Generate token' at bottom
6. Go to your repository settings page
7. Enter 'Secrets' tab
8. Create new `PERSONAL_GITHUB_TOKEN` secret with a generated token string

Now you're ready for workflow setup.

```yaml
jobs:
  benchmark:
    name: Performance regression check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-go@v1
      # Run benchmark with `go test -bench` and stores the output to a file
      - name: Run benchmark
        run: go test -bench 'BenchmarkFib' | tee output.txt
      # gh-pages branch is updated and pushed automatically with extracted benchmark data
      - name: Store benchmark result
        uses: rhysd/github-action-benchmark@v1
        with:
          name: My Project Go Benchmark
          tool: 'go'
          output-file-path: output.txt
          # Personal access token to deploy GitHub Pages branch
          github-token: ${{ secrets.PERSONAL_GITHUB_TOKEN }}
          # Push and deploy GitHub pages branch automatically
          auto-push: true
```

The step which runs `github-action-benchmark` does followings:

1. Extract benchmark result from the output in `output.txt`
2. Switch branch to `gh-pages`
3. Read existing benchmark results from `dev/bench/data.js`
4. Update `dev/bench/data.js` with the extracted benchmark result
5. Generate a commit to store the update in `gh-pages` branch
6. Push `gh-pages` branch to remote
7. Compare the results with previous results and make an alert if possible performance regression is detected

After the first workflow run, you will get the first result on `https://you.github.io/repo/dev/bench`
[like this][examples-page].

By default, this action assumes that `gh-pages` is your GitHub Pages branch and that `/dev/bench` is
a path to put the benchmark dashboard page. If they don't fit your use case, please tweak them by
`gh-pages-branch` and `benchmark-data-dir-path` inputs.

This action merges all benchmark results into one GitHub pages branch. If your workflows have multiple
steps to check benchmarks from multiple tools, please give `name` input to each step to make each
benchmark results identical.

Please see the above ['Examples' section](#examples) to see live workflow examples for each language.

If you don't want to pass GitHub API token to this action, it's still OK.

```yaml
- name: Store benchmark result
  uses: rhysd/github-action-benchmark@v1
  with:
    name: My Project Go Benchmark
    tool: 'go'
    output-file-path: output.txt
    # Set auto-push to false since GitHub API token is not given
    auto-push: false
# Push gh-pages branch by yourself
- name: Push benchmark result
  run: git push 'https://you:${{ secrets.PERSONAL_GITHUB_TOKEN }}@github.com/you/repo-name.git' gh-pages:gh-pages
```

Please add a step to push the branch to the remote.


### Tool specific setup

Please read `README.md` files at each example directory. Usually, take stdout from a benchmark tool
and store it to file. Then specify the file path to `output-file-path` input.

- [`cargo bench` for Rust projects](./examples/rust/README.md)
- [`go test` for Go projects](./examples/go/README.md)
- [Benchmark.js for JavaScript/TypeScript projects](./examples/benchmarkjs/README.md)
- [pytest-benchmark for Python projects with pytest](./examples/pytest/README.md)
- [Google Benchmark Framework for C++ projects](./examples/cpp/README.md)

These examples are run in workflows of this repository as described in the 'Examples' section above.


### Action inputs

Input definitions are written in [action.yml](./action.yml).

#### `name` (Required)

- Type: String
- Default: `"Benchmark"`

Name of the benchmark. This value must be identical across all benchmarks in your repository.

#### `tool` (Required)

- Type: String
- Default: N/A

Tool for running benchmark. The value must be one of `"cargo"`, `"go"`, `"benchmarkjs"`, `"pytest"`,
`"googlecpp"`, `"catch2"`.

#### `output-file-path` (Required)

- Type: String
- Default: N/A

Path to a file which contains the output from benchmark tool. The path can be relative to repository root.

#### `gh-pages-branch` (Required)

- Type: String
- Default: `"gh-pages"`

Name of your GitHub pages branch.

Note: If you're using `docs/` directory of `master` branch for GitHub pages, please set `gh-pages-branch`
to `master` and `benchmark-data-dir-path` to the directory under `docs` like `docs/dev/bench`.

#### `benchmark-data-dir-path` (Required)

- Type: String
- Default: `"dev/bench"`

Path to a directory that contains benchmark files on the GitHub pages branch. For example, when this value
is set to `"path/to/bench"`, `https://you.github.io/repo-name/path/to/bench` will be available as benchmarks
dashboard page. If it does not contain `index.html`, this action automatically generates it at first run.
The path can be relative to repository root.

#### `github-token` (Optional)

- Type: String
- Default: N/A

GitHub API token. For updating a GitHub Pages branch with public repo, a personal access token is necessary.
Please see the 'Commit comment' section for more details.

#### `auto-push` (Optional)

- Type: Boolean
- Default: `false`

If it is set to `true`, this action automatically pushes the generated commit to GitHub Pages branch.
Otherwise, you need to push it by your own. Please read 'Commit comment' section above for more details.

#### `comment-always` (Optional)

- Type: Boolean
- Default: `false`

If it is set to `true`, this action will leave a commit comment comparing the current benchmark with previous.
`github-token` is necessary as well. Please note that a personal access token is not necessary to
send a commit comment. `secrets.GITHUB_TOKEN` is sufficient.

#### `save-data-file` (Optional)

- Type: Boolean
- Default: `true`

If it is set to `true`, this action will not save the current benchmark to the external data file.
You can use this option to set up your action to compare the benchmarks between PR and base branch.

#### `alert-threshold` (Optional)

- Type: String
- Default: `"200%"`

Percentage value like `"150%"`. It is a ratio indicating how worse the current benchmark result is.
For example, if we now get `150 ns/iter` and previously got `100 ns/iter`, it gets `150%` worse.

If the current benchmark result is worse than previous exceeding the threshold, an alert will happen.
See `comment-on-alert` and `fail-on-alert` also.

#### `comment-on-alert` (Optional)

- Type: Boolean
- Default: `false`

If it is set to `true`, this action will leave a commit comment when an alert happens [like this][alert-comment-example].
`github-token` is necessary as well. Please note that a personal access token is not necessary to
send a commit comment. `secrets.GITHUB_TOKEN` is sufficient. For the threshold for this, please see
`alert-threshold` also.

#### `fail-on-alert` (Optional)

- Type: Boolean
- Default: `false`

If it is set to `true`, the workflow will fail when an alert happens. For the threshold for this, please
see `alert-threshold` and `fail-threshold` also.

#### `fail-threshold` (Optional)

- Type: String
- Default: The same value as `alert-threshold`

Percentage value in the same format as `alert-threshold`. If this value is set, the threshold value
will be used to determine if the workflow should fail. Default value is set to the same value as
`alert-threshold` input. **This value must be equal or larger than `alert-threshold` value.**

#### `alert-comment-cc-users` (Optional)

- Type: String
- Default: N/A

Comma-separated GitHub user names mentioned in alert commit comment like `"@foo,@bar"`. These users
will be mentioned in a commit comment when an alert happens. For configuring alerts, please see
`alert-threshold` and `comment-on-alert` also.

#### `external-data-json-path` (Optional)

- Type: String
- Default: N/A

External JSON file which contains benchmark results until previous job run. When this value is set,
this action updates the file content instead of generating a Git commit in GitHub Pages branch.
This option is useful if you don't want to put benchmark results in GitHub Pages branch. Instead,
you need to keep the JSON file persistently among job runs. One option is using a workflow cache
with `actions/cache` action. Please read 'Minimal setup' section above.

#### `read-commit-id` (Optional)

- Type: Boolean
- Default: `false`

Read the commit id from the workspace. This is useful when you have switched the repository away
from the commit that started this action.

#### `max-items-in-chart` (Optional)

- Type: Number
- Default: N/A

Max number of data points in a chart for avoiding too busy chart. This value must be unsigned integer
larger than zero. If the number of benchmark results for some benchmark suite exceeds this value,
the oldest one will be removed before storing the results to file. By default this value is empty
which means there is no limit.


### Action outputs

No action output is set by this action for the parent GitHub workflow.


### Caveats

#### Run only on your branches

Please ensure that your benchmark workflow runs only on your branches. Please avoid running it on
pull requests. If a branch were pushed to GitHub pages branch on a pull request, anyone who creates
a pull request on your repository could modify your GitHub pages branch.

For this, you can specify a branch that runs your benchmark workflow on `on:` section. Or set the
proper condition to `if:` section of step which pushes GitHub pages.

e.g. Runs on only `master` branch

```yaml
on:
  push:
    branches:
      - master
```

e.g. Push when not running for a pull request

```yaml
- name: Push benchmark result
  run: git push ...
  if: github.event_name != 'pull_request'
```

#### Stability of Virtual Environment

As far as watching the benchmark results of examples in this repository, the amplitude of the benchmarks
is about +- 10~20%. If your benchmarks use some resources such as networks or file I/O, the amplitude
might be bigger.

If the amplitude is not acceptable, please prepare a stable environment to run benchmarks.
GitHub action supports [self-hosted runners](https://help.github.com/en/actions/automating-your-workflow-with-github-actions/about-self-hosted-runners).


### Customizing the benchmarks result page

This action creates the default `index.html` in the directory specified with `benchmark-data-dir-path`
input. By default, every benchmark test case has own chart on the page. Charts are drawn with
[Chart.js](https://www.chartjs.org/).

If it does not fit your use case, please modify the HTML file or replace it with your favorite one.
Every benchmark data is stored in `window.BENCHMARK_DATA` so you can create your favorite view.


### Versioning

This action conforms semantic versioning 2.0.

For example, `rhysd/github-action-benchmark@v1` means the latest version of `1.x.y`. And
`rhysd/github-action-benchmark@v1.0.2` always uses `v1.0.2` even if a newer version is published.

`master` branch of this repository is for development and does not work as action.


### Track updates of this action

To notice new version releases, please [watch 'release only'][help-watch-release] at [this repository][proj].
Every release will appear on your GitHub notifications page.



## Future work

- Allow user-defined benchmark tool
  - Accept benchmark results as an array of benchmark results as JSON. User can generate JSON file
    to integrate any benchmarking tool to this action
- Support pull requests. Instead of updating GitHub pages, add a comment to the pull request to explain
  benchmark results.
- Add more benchmark tools:
  - [airspeed-velocity Python benchmarking tool](https://github.com/airspeed-velocity/asv)
- Allow uploading results to metrics services such as [mackerel](https://mackerel.io/)
- Show extracted benchmark data in the output from this action
- Add a table view in dashboard page to see all data points in table



## Related actions

- [lighthouse-ci-action][] is an action for [Lighthouse CI][lighthouse-ci]. If you're measuring performance
  of your web application, using Lighthouse CI and lighthouse-ci-action would be better than using this
  action.



## License

[the MIT License](./LICENSE.txt)



[build-badge]: https://github.com/rhysd/github-action-benchmark/workflows/CI/badge.svg?branch=master&event=push
[ci]: https://github.com/rhysd/github-action-benchmark/actions?query=workflow%3ACI
[codecov-badge]: https://codecov.io/gh/rhysd/github-action-benchmark/branch/master/graph/badge.svg
[codecov]: https://codecov.io/gh/rhysd/github-action-benchmark
[release-badge]: https://img.shields.io/github/v/release/rhysd/github-action-benchmark.svg
[marketplace]: https://github.com/marketplace/actions/continuous-benchmark
[proj]: https://github.com/rhysd/github-action-benchmark
[rust-badge]: https://github.com/rhysd/github-action-benchmark/workflows/Rust%20Example/badge.svg
[go-badge]: https://github.com/rhysd/github-action-benchmark/workflows/Go%20Example/badge.svg
[benchmarkjs-badge]: https://github.com/rhysd/github-action-benchmark/workflows/Benchmark.js%20Example/badge.svg
[pytest-benchmark-badge]: https://github.com/rhysd/github-action-benchmark/workflows/Python%20Example%20with%20pytest/badge.svg
[cpp-badge]: https://github.com/rhysd/github-action-benchmark/workflows/C%2B%2B%20Example/badge.svg
[catch2-badge]: https://github.com/rhysd/github-action-benchmark/workflows/Catch2%20C%2B%2B%20Example/badge.svg
[github-action]: https://github.com/features/actions
[cargo-bench]: https://doc.rust-lang.org/cargo/commands/cargo-bench.html
[benchmarkjs]: https://benchmarkjs.com/
[gh-pages]: https://pages.github.com/
[examples-page]: https://rhysd.github.io/github-action-benchmark/dev/bench/
[pytest-benchmark]: https://pypi.org/project/pytest-benchmark/
[pytest]: https://pypi.org/project/pytest/
[alert-comment-example]: https://github.com/rhysd/github-action-benchmark/commit/077dde1c236baba9244caad4d9e82ea8399dae20#commitcomment-36047186
[rust-workflow-example]: https://github.com/rhysd/github-action-benchmark/actions?query=workflow%3A%22Rust+Example%22
[go-workflow-example]: https://github.com/rhysd/github-action-benchmark/actions?query=workflow%3A%22Go+Example%22
[benchmarkjs-workflow-example]: https://github.com/rhysd/github-action-benchmark/actions?query=workflow%3A%22Benchmark.js+Example%22
[pytest-workflow-example]: https://github.com/rhysd/github-action-benchmark/actions?query=workflow%3A%22Python+Example+with+pytest%22
[cpp-workflow-example]: https://github.com/rhysd/github-action-benchmark/actions?query=workflow%3A%22C%2B%2B+Example%22
[catch2-workflow-example]: https://github.com/rhysd/github-action-benchmark/actions?query=workflow%3A%22Catch2+C%2B%2B+Example%22
[help-watch-release]: https://help.github.com/en/github/receiving-notifications-about-activity-on-github/watching-and-unwatching-releases-for-a-repository
[help-github-token]: https://help.github.com/en/actions/automating-your-workflow-with-github-actions/authenticating-with-the-github_token
[help-personal-access-token]: https://help.github.com/en/github/authenticating-to-github/creating-a-personal-access-token-for-the-command-line
[minimal-workflow-example]: https://github.com/rhysd/github-action-benchmark/actions?query=workflow%3A%22Example+for+minimal+setup
[commit-comment-workflow-example]: https://github.com/rhysd/github-action-benchmark/actions?query=workflow%3A%22Example+for+alert+with+commit+comment
[google-benchmark]: https://github.com/google/benchmark
[catch2]: https://github.com/catchorg/Catch2
[lighthouse-ci-action]: https://github.com/treosh/lighthouse-ci-action
[lighthouse-ci]: https://github.com/GoogleChrome/lighthouse-ci
