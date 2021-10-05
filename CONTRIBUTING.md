Contributing to github-action-benchmark
=======================================

## How to add new benchmark tool support

Thank you for being interested in adding a support for new benchmarking tool.

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

Important part is 2 and 3.

For example, here are commits to add support for `go test -bench`:

- https://github.com/benchmark-action/github-action-benchmark/commit/6425d898fdfe2ab1540f1af3adb3f37a0ae623f3
- https://github.com/benchmark-action/github-action-benchmark/commit/272a6808eff6b652247813089ab9aef4b8a2bd50
- https://github.com/benchmark-action/github-action-benchmark/commit/3a25daca11153c62be23142120fc6c93b4bd411d

And for another example, here are commits to add support for `pytest-benchmark`:

- Implement and add example: https://github.com/benchmark-action/github-action-benchmark/commit/18c82f288b20de1538f8d7a1669221b545968f54
- Add test: https://github.com/benchmark-action/github-action-benchmark/commit/eb449170566ff5882e75eeaeb637f17a302fbf7e
- Add workflows for test and example: https://github.com/benchmark-action/github-action-benchmark/commit/1e4ebf2e9ecde9e7620661c60455b22837a2bdaf
- Add documentation: https://github.com/benchmark-action/github-action-benchmark/commit/895f92f564521597492bd281cbf6c8efd39f628e

Optional: If you add a new example workflow under `.github/workflows/`, you might want to add your
user name to `alert-comment-cc-users` input like `alert-comment-cc-users: '@rhysd,@you'`.

If something is unclear for you, please ask me questions by creating a new issue.



## How to create a new release

1. Run `$ bash scripts/prepare-release.sh v1`
2. Check changes with `git diff --cached`
3. If ok, create a new commit and tag it with `v1.x.y`
4. Push the tag and commit to `v1` remote repository and make a new release on GitHub
