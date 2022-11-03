## Unreleased

<a name="v1.15.0"></a>
# [v1.15.0](https://github.com/benchmark-action/github-action-benchmark/releases/tag/v1.15.0) - 03 Nov 2022

- **Feat** Add support for Java via JMH (#134)
- **Chore** Update @actions/core, @actions/exec and @actions/io to the latest version (#137)

<a name="v1.14.0"></a>
# [v1.14.0](https://github.com/benchmark-action/github-action-benchmark/releases/tag/v1.14.0) - 28 May 2022

- **Feat** Added benchmark luau support (#123)
- **Chore** Bump minimist from 1.2.5 to 1.2.6 (#114)
- **Feat** Implement deploy to another repository (#112)

<a name="v1.13.0"></a>
# [v1.13.0](https://github.com/benchmark-action/github-action-benchmark/releases/tag/v1.13.0) - 17 Feb 2022

- **Feat:** Updated urls to support GHES (#104)
- **Feat:** Add support for BenchmarkDotNet (#109)
- **Chore** Bump node-fetch from 2.6.6 to 2.6.7 (#107)

<a name="v1.12.0"></a>
# [v1.12.0](https://github.com/benchmark-action/github-action-benchmark/releases/tag/v1.12.0) - 28 Jan 2022

- **Feat:** Support private repositories (#105)
- **Chore** Bump action runner to node v16 (#106)

<a name="v1.11.3"></a>
# [v1.11.3](https://github.com/benchmark-action/github-action-benchmark/releases/tag/v1.11.3) - 31 Dec 2021

- **Fix:** Fix trailing whitespace characters in cargo benchmarks (#97)

<a name="v1.11.2"></a>
# [v1.11.2](https://github.com/benchmark-action/github-action-benchmark/releases/tag/v1.11.2) - 28 Dec 2021

- **Fix:** Added option to use Rust benchmark names with spaces (#94)

<a name="v1.11.1"></a>
# [v1.11.1](https://github.com/benchmark-action/github-action-benchmark/releases/tag/v1.11.1) - 04 Dec 2021

- **Fix:** Fix/go tabled benchmarks (#32)
- **New:** Support BenchmarkTools.jl in Julia (#89)
- **Improve:** Update several dependencies including TypeScript v4.5.2
- **Improve:** Use [Jest](https://jestjs.io/) for unit testing

<a name="v1.10.0"></a>
# [v1.10.0](https://github.com/benchmark-action/github-action-benchmark/releases/tag/v1.10.0) - 28 Oct 2021

- **New:** Allow user defined custom benchmarks (#81)

<a name="v1.9.0"></a>
# [v1.9.0](https://github.com/benchmark-action/github-action-benchmark/releases/tag/v1.9.0) - 12 Oct 2021

- **Fix:** manual and scheduled runs (#74) 

<a name="v1.8.1"></a>
# [v1.8.1](https://github.com/benchmark-action/github-action-benchmark/releases/tag/v1.8.1) - 10 Jun 2020

- **Fix:** Allow `/` in `cargo bench` benchmark name (#26)
- **New:** Add an example with [Criterion.rs](https://github.com/bheisler/criterion.rs) for Rust projects

[Changes][v1.8.1]


<a name="v1.8.0"></a>
# [v1.8.0](https://github.com/benchmark-action/github-action-benchmark/releases/tag/v1.8.0) - 17 Mar 2020

- **New:** Added `comment-always` option to leave a comment of benchmarking results at the commit always. [Thanks @pksunkara](https://github.com/benchmark-action/github-action-benchmark/pull/17)
- **New:** Added `save-data-file` option to skip saving data file. Setting `false` to this value is useful when you don't want to update Git repository. [Thanks @pksunkara](https://github.com/benchmark-action/github-action-benchmark/pull/17)
- **Improve:** `+/-` is now replaced with `±`
- **Improve:** Better formatting for floating point numbers

[Changes][v1.8.0]


<a name="v1.7.1"></a>
# [v1.7.1](https://github.com/benchmark-action/github-action-benchmark/releases/tag/v1.7.1) - 23 Feb 2020

- **Fix:** Benchmark output parser could not parse `\r\n` as newline correctly (#16)
- **Improve:** Prefer `@actions/github.GitHub` wrapper to `@octokit/rest.Octokit`

[Changes][v1.7.1]


<a name="v1.7.0"></a>
# [v1.7.0](https://github.com/benchmark-action/github-action-benchmark/releases/tag/v1.7.0) - 21 Jan 2020

- **New:** Add [Catch2](https://github.com/catchorg/Catch2) support. Please read [the example](https://github.com/benchmark-action/github-action-benchmark/tree/master/examples/catch2) for more details. [Thanks @bernedom](https://github.com/benchmark-action/github-action-benchmark/pull/6)
- **Fix:** Deploying to GitHub Pages did not work when checking out the repository with `actions/checkout@v2`
- **Improve:** Update several dependencies including `@actions/*` packages

[Changes][v1.7.0]


<a name="v1.6.7"></a>
# [v1.6.7](https://github.com/benchmark-action/github-action-benchmark/releases/tag/v1.6.7) - 01 Jan 2020

- **Fix:** Extracting the benchmark result value from `go test -bench` did not assume float numbers (Fixed [#5](https://github.com/benchmark-action/github-action-benchmark/issues/5))
- **Fix:** Running this action on `pull_request` event caused an error since `head_commit` payload is not set at the event. In the case, now this action tries to extract the commit information from `pull_request` payload

[Changes][v1.6.7]


<a name="v1.6.6"></a>
# [v1.6.6](https://github.com/benchmark-action/github-action-benchmark/releases/tag/v1.6.6) - 23 Dec 2019

- **Fix:** Parse floating numbers in the benchmark results from Benchmark.js. ([Thanks @Bnaya](https://github.com/benchmark-action/github-action-benchmark/pull/3))

[Changes][v1.6.6]


<a name="v1.6.5"></a>
# [v1.6.5](https://github.com/benchmark-action/github-action-benchmark/releases/tag/v1.6.5) - 19 Dec 2019

- **Fix:** Titles are set to empty in auto-generated default `index.html`. To apply this fix, please remove current `index.html` in your GitHub Pages branch and run this action again
- **Fix:** Skip fetching GitHub Pages branch before switching to the branch when `skip-fetch-gh-pages` is set to true
- **Improve:** Explicitly note no action output from this action in README.md

[Changes][v1.6.5]


<a name="v1.6.4"></a>
# [v1.6.4](https://github.com/benchmark-action/github-action-benchmark/releases/tag/v1.6.4) - 16 Dec 2019

- **Fix:** Supported [actions/checkout@v2](https://github.com/actions/checkout/releases/tag/v2.0.0)
- **Improve:** Refactored `index.html` automatically generated when it does not exist
- **Improve:** Update dependencies (`actions/github` v2)

[Changes][v1.6.4]


<a name="v1.6.3"></a>
# [v1.6.3](https://github.com/benchmark-action/github-action-benchmark/releases/tag/v1.6.3) - 08 Dec 2019

- **Improve:** Tweak number of retries for more robust automatic `git push`

[Changes][v1.6.3]


<a name="v1.6.2"></a>
# [v1.6.2](https://github.com/benchmark-action/github-action-benchmark/releases/tag/v1.6.2) - 07 Dec 2019

- **Fix:** Retry logic for `git push` did not work properly since stderr output was not included in error message

[Changes][v1.6.2]


<a name="v1.6.1"></a>
# [v1.6.1](https://github.com/benchmark-action/github-action-benchmark/releases/tag/v1.6.1) - 07 Dec 2019

- **Fix:** Time unit of mean time in `pytest` benchmark results were always `sec`. Now time units are converted to `msec`, `usec` and `nsec` if necessary
- **Fix:** Detecting rejection by remote on `git push` was not sufficient
- **Improve:** Add a small link at right bottom of dashboard page to show this action provided the page
- **Improve:** Showed at least 1 significant digit for threshold float values like `2.0`
- **Improve:** Updated dependencies


[Changes][v1.6.1]


<a name="v1.6.0"></a>
# [v1.6.0](https://github.com/benchmark-action/github-action-benchmark/releases/tag/v1.6.0) - 04 Dec 2019

- **New:** `fail-threshold` input was added. Format is the same as `alert-threshold`, but you can give different thresholds to sending a commit comment and making the workflow fail by giving different value to `fail-threshold` from `alert-threshold`. This value is optional. If omitted, `fail-threshold` value is the same as `alert-threshold`
- **Improve:** Retry logic was improved on `git push` failed due to remote branch updates after `git pull`. Now this action retries entire process to update `gh-pages` branch when the remote rejected automatic `git push`. Previously this action tried to rebase the local onto the remote but it sometimes failed due to conflicts

[Changes][v1.6.0]


<a name="v1.5.0"></a>
# [v1.5.0](https://github.com/benchmark-action/github-action-benchmark/releases/tag/v1.5.0) - 30 Nov 2019

- **New:** Added `max-items-in-chart` input was added to limit the number of data points in a graph chart.
- **New:** Supported [Google C++ Benchmark Framework](https://github.com/google/benchmark) for C++ projects. Please check [the example project](https://github.com/benchmark-action/github-action-benchmark/tree/master/examples/cpp) and [the example workflow](https://github.com/benchmark-action/github-action-benchmark/blob/master/.github/workflows/cpp.yml) to know the setup
- **Fix:** Fix the order of graphs in the default `index.html`. To apply this fix, please remove `index.html` in your GitHub Pages branch and run your benchmark workflow again
- **Improve:** Use the actions marketplace URL for the link to this action in commit comment
- **Improve:** Updated dependencies
- **Dev:** Added Many tests for checking the updates on a new benchmark result
- **Dev:** Changed directory structure. Sources are now put in `src/` directory

[Changes][v1.5.0]


<a name="v1.4.0"></a>
# [v1.4.0](https://github.com/benchmark-action/github-action-benchmark/releases/tag/v1.4.0) - 23 Nov 2019

- **New:** `external-data-json-path` input was added to support to put benchmark data externally rather than Git branch
  - By using this input and [actions/cache](https://github.com/actions/cache), you no longer need to use Git branch for this action if you only want performance alerts. Benchmark data is stored as workflow cache.
  - By this input, minimal setup for this action is much easier. Please read ['How to use' section](https://github.com/benchmark-action/github-action-benchmark#minimal-setup) in README.md.

[Changes][v1.4.0]


<a name="v1.3.2"></a>
# [v1.3.2](https://github.com/benchmark-action/github-action-benchmark/releases/tag/v1.3.2) - 23 Nov 2019

- **Improve:** Styles in alert commit comment were improved
- **Fix:** When benchmark name (with `name` input) contained spaces, URL for the workflow which detected performance regression was broken

[Changes][v1.3.2]


<a name="v1.3.1"></a>
# [v1.3.1](https://github.com/benchmark-action/github-action-benchmark/releases/tag/v1.3.1) - 21 Nov 2019

- **Fix:** `git push` sometimes failed in the situation where `prepush` hook is set and runs unexpectedly. Now `git push` is run with `--no-verify` for pushing auto generated commit to remote.

[Changes][v1.3.1]


<a name="v1.3.0"></a>
# [v1.3.0](https://github.com/benchmark-action/github-action-benchmark/releases/tag/v1.3.0) - 21 Nov 2019

- **New:** Alert feature was added :tada:
  - With this feature enabled, you can get alert commit comment or make workflow fail when possible performance regression is detected [like this](https://github.com/rhysd/github-action-benchmark/commit/077dde1c236baba9244caad4d9e82ea8399dae20#commitcomment-36047186)
  - `comment-on-alert` input was added to enable commit comment on alert. `github-token` input is necessary as well to use GitHub API. Unlike deploying GitHub Pages, `secrets.GITHUB_TOKEN` is sufficient for this purpose (if you don't use GitHub Pages). The input is set to `false` by default.
  - `fail-on-alert` input was added to mark running workflow fail on alert. The input is set to `false` by default.
  - `alert-threshold` input was added to specify the threshold to check alerts. When current result gets worse than previous exceeding the threshold. Value is ratio such as `"200%"`. For example, when benchmark gets result 230 ns/iter and previous one was 100ns/iter, it means 230% worse and an alert will happen.
  - Please read [documentation](https://github.com/benchmark-action/github-action-benchmark#use-this-action-with-alert-commit-comment) for setup
- **New:** `alert-comment-cc-users` input was added to specify users mentioned in an alert commit comment so that they can easily notice it via GitHub notification
- **New:** `skip-fetch-gh-pages` input was added to skip `git pull` which is automatically executed on public repo or when you set `github-token` on private repo.
- **Improve:** E2E checks on CI were added
- **Improve:** Updated dependencies

[Changes][v1.3.0]


<a name="v1.2.0"></a>
# [v1.2.0](https://github.com/benchmark-action/github-action-benchmark/releases/tag/v1.2.0) - 17 Nov 2019

- **New:** Support [pytest-benchmark](https://pypi.org/project/pytest-benchmark/) for Python projects which use pytest
  - Benchmark value is how long one iteration takes (seconds/iter)
- **Improve:** Show more extra data in tooltip which are specific to tools
  - Go
    - Iterations
    - Number of CPUs used
  - Benchmark.js
    - Number of samples
  - pytest-benchmark
    - Mean time
    - Number of rounds

For reflecting the extra data improvement, please refresh your `index.html`. Remove current `index.html` in GitHub Pages branch and push the change to remote, then re-run your benchmark workflow.

[Changes][v1.2.0]


<a name="v1.1.4"></a>
# [v1.1.4](https://github.com/benchmark-action/github-action-benchmark/releases/tag/v1.1.4) - 16 Nov 2019

- **Improve:** Title styles in default `index.html` which is generated when no `index.html` is in your GitHub Pages branch. If you want to update your `index.html` to the latest, please remove it and push to remote at first then re-run your workflow which will invoke github-action-benchmark
- **Improve:** More metadata in `action.yml`. Now icon and its color are set.

[Changes][v1.1.4]


<a name="v1.1.3"></a>
# [v1.1.3](https://github.com/benchmark-action/github-action-benchmark/releases/tag/v1.1.3) - 16 Nov 2019

- **Fix:** Retry failed when no Git user config is provided. Ensure to give bot user info to each `git` command invocations

[Changes][v1.1.3]


<a name="v1.1.2"></a>
# [v1.1.2](https://github.com/benchmark-action/github-action-benchmark/releases/tag/v1.1.2) - 16 Nov 2019

- **Improve:** Added retry for `git push`. When remote GitHub Pages branch is updated after the current workflow had fetched the branch, `git push` will fail because the remote branch is not up-to-date. In the case this action will try to rebase onto the latest remote by `git pull --rebase` and `git push` again. This is useful when your multiple workflows may be trying to push GitHub Pages branch at the same timing. `auto-push` input must be set to `true` for this.
- **Fix:** Description for `auto-push` was missing in `action.yml`

[Changes][v1.1.2]


<a name="v1.1.1"></a>
# [v1.1.1](https://github.com/benchmark-action/github-action-benchmark/releases/tag/v1.1.1) - 14 Nov 2019

- **Improve:** More strict check for `auto-push` input. Now the value must be one of `true`, `false` (default value is `false`)

[Changes][v1.1.1]


<a name="v1.1.0"></a>
# [v1.1.0](https://github.com/benchmark-action/github-action-benchmark/releases/tag/v1.1.0) - 14 Nov 2019

- **New:** Added `auto-push` input
  - If this value is set to `true`, this action pushes GitHub Pages branch to remote automatically. You no longer need to push the branch by yourself.
  - Below `github-token` input must be set for this
  - This input is optional. You can still push the branch by yourself if you want
  - Please read [documentation](https://github.com/benchmark-action/github-action-benchmark#how-to-use) for more details
- **New:** Added `github-token` input
  - For doing some operations which requires GitHub API token, this input is necessary
    - pull from remote branch when your repository is private
    - push to remote branch
    - deploy and trigger GitHub Pages build
  - This input is optional. When you do none of above operations, this input is not necessary
- `README.md` was updated to avoid [the issue on public repository](https://github.community/t/github-action-not-triggering-gh-pages-upon-push/16096) (#1)

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

Note that you need to make a personal access token for deploying GitHub Pages from GitHub Action workflow. Please read `RADME.md` for more details.

[Changes][v1.1.0]


<a name="v1.0.2"></a>
# [v1.0.2](https://github.com/benchmark-action/github-action-benchmark/releases/tag/v1.0.2) - 10 Nov 2019

First release :tada:

Please read documentation for getting started:

https://github.com/benchmark-action/github-action-benchmark#readme

[Changes][v1.0.2]


[v1.9.0]: https://github.com/benchmark-action/github-action-benchmark/compare/v1.8.1...v1.9.0
[v1.8.1]: https://github.com/benchmark-action/github-action-benchmark/compare/v1.8.0...v1.8.1
[v1.8.0]: https://github.com/benchmark-action/github-action-benchmark/compare/v1.7.1...v1.8.0
[v1.7.1]: https://github.com/benchmark-action/github-action-benchmark/compare/v1.7.0...v1.7.1
[v1.7.0]: https://github.com/benchmark-action/github-action-benchmark/compare/v1.6.7...v1.7.0
[v1.6.7]: https://github.com/benchmark-action/github-action-benchmark/compare/v1.6.6...v1.6.7
[v1.6.6]: https://github.com/benchmark-action/github-action-benchmark/compare/v1.6.5...v1.6.6
[v1.6.5]: https://github.com/benchmark-action/github-action-benchmark/compare/v1.6.4...v1.6.5
[v1.6.4]: https://github.com/benchmark-action/github-action-benchmark/compare/v1.6.3...v1.6.4
[v1.6.3]: https://github.com/benchmark-action/github-action-benchmark/compare/v1.6.2...v1.6.3
[v1.6.2]: https://github.com/benchmark-action/github-action-benchmark/compare/v1.6.1...v1.6.2
[v1.6.1]: https://github.com/benchmark-action/github-action-benchmark/compare/v1.6.0...v1.6.1
[v1.6.0]: https://github.com/benchmark-action/github-action-benchmark/compare/v1.5.0...v1.6.0
[v1.5.0]: https://github.com/benchmark-action/github-action-benchmark/compare/v1.4.0...v1.5.0
[v1.4.0]: https://github.com/benchmark-action/github-action-benchmark/compare/v1.3.2...v1.4.0
[v1.3.2]: https://github.com/benchmark-action/github-action-benchmark/compare/v1.3.1...v1.3.2
[v1.3.1]: https://github.com/benchmark-action/github-action-benchmark/compare/v1.3.0...v1.3.1
[v1.3.0]: https://github.com/benchmark-action/github-action-benchmark/compare/v1.2.0...v1.3.0
[v1.2.0]: https://github.com/benchmark-action/github-action-benchmark/compare/v1.1.4...v1.2.0
[v1.1.4]: https://github.com/benchmark-action/github-action-benchmark/compare/v1.1.3...v1.1.4
[v1.1.3]: https://github.com/benchmark-action/github-action-benchmark/compare/v1.1.2...v1.1.3
[v1.1.2]: https://github.com/benchmark-action/github-action-benchmark/compare/v1.1.1...v1.1.2
[v1.1.1]: https://github.com/benchmark-action/github-action-benchmark/compare/v1.1.0...v1.1.1
[v1.1.0]: https://github.com/benchmark-action/github-action-benchmark/compare/v1.0.2...v1.1.0
[v1.0.2]: https://github.com/benchmark-action/github-action-benchmark/tree/v1.0.2

 <!-- Generated by changelog-from-release -->
