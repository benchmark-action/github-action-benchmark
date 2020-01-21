Development
===========

## How to add new benchmark tool support

At first, please determine how to get benchmark output from the new benchmarking tool.
Some tools support multiple formats for outputting the results. In the case please choose
machine-friendly one. For example, if a tool supports both human-readable console output
and machine-friendly JSON output, please choose the latter.

Adding support for new benchmarking tools is welcome!

1. Add your tool name in `src/config.ts`
2. Implement the logic to extract benchmark results from output in `src/extract.ts`
3. Add tests for your tool under `test/*.ts`
4. Add your tool's color in `default_index_html.ts`
5. Add example project under `examples/` directory
6. Add workflow to run the example project under `.github/workflows/` directory
7. Update `.github/workflows/ci.yml` to check your tool works without an error (see below for needed changes)
8. Add README.md in the example project directory and update README.md at root directory

Important part is 2.

For example, here are commits to add support for `go test -bench`:

- https://github.com/rhysd/github-action-benchmark/commit/6425d898fdfe2ab1540f1af3adb3f37a0ae623f3
- https://github.com/rhysd/github-action-benchmark/commit/272a6808eff6b652247813089ab9aef4b8a2bd50
- https://github.com/rhysd/github-action-benchmark/commit/3a25daca11153c62be23142120fc6c93b4bd411d

And for another example, here are commits to add support for `pytest-benchmark`:

- Implement and add example: https://github.com/rhysd/github-action-benchmark/commit/18c82f288b20de1538f8d7a1669221b545968f54
- Add test: https://github.com/rhysd/github-action-benchmark/commit/eb449170566ff5882e75eeaeb637f17a302fbf7e
- Add workflows for test and example: https://github.com/rhysd/github-action-benchmark/commit/1e4ebf2e9ecde9e7620661c60455b22837a2bdaf
- Add documentation: https://github.com/rhysd/github-action-benchmark/commit/895f92f564521597492bd281cbf6c8efd39f628e

## Running CI workflow on a forked repo

Since the benchmark data includes the URL of the repository the tests and examples will fail when the repo is forked. In order to get the CI workflow and all examples running the URL has to be changed

### Change workflows and tests

1. in [`ci_validate_modification.ts`](scripts/ci_validate_modification.ts) in the `validateJSON` function replace `https://github.com/rhysd/github-action-benchmark` with your repo URL (i.e. `https://github.com/<YOU>/github-action-benchmark`)
2. in all workflow (`.yml`) in `.github/workflows` replace `alert-comment-cc-users: '@rhysd'` with your user

### Adapt past benchmark data to new repo path 

1. checkout the branch `gh-pages` 
2. in `dev/bench/data.js` replace `https://github.com/rhysd/github-action-benchmark` with your repo URL (i.e. `https://github.com/<YOU>/github-action-benchmark`)

In case you are adding a new tool and wand to run ci, you have to add at least one set of example data to the `data.js` in the gh-pages branch.

## How to create a new release

1. Run `$ bash scripts/prepare-release.sh v1`
2. Check changes with `git diff --cached`
3. If ok, create a new commit and tag it with `v1.x.y`
4. Push the commit and tag to `v1` remote repository and make a release on GitHub
