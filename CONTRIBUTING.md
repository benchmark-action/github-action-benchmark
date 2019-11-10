Development
===========

## How to add new benchmark tool support

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

## How to create a new release

1. Run `$ bash scripts/prepare-release.sh v1`
2. Check changes with `git diff --cached`
3. If ok, create a new commit and tag it with `v1.x.y`
4. Push to `v1` remote repository and make a release on GitHub
