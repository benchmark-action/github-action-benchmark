Development
===========

## How to add new benchmark tool support

Adding support for new benchmaking tools is welcome!

1. Add your tool name in `config.ts`
2. Implement the logic to extract benchmark results from output in `extract.ts`
3. Add tests for your tool under `test/*.ts`
4. Add your tool's color in `default_index_html.ts`
5. Add example project under `examples/` directory
6. Add workflow to run the example project under `.github/workflows/` directory
7. Update `.github/workflows/ci.yml` to check your tool works without an error
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

## How to create a new release

1. Run `$ bash scripts/prepare-release.sh v1`
2. Check changes with `git diff --cached`
3. If ok, create a new commit and tag it with `v1.x.y`
4. Push to `v1` remote repository and make a release on GitHub
