# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Test Commands

```bash
npm run build          # Compile TypeScript (uses tsconfig.build.json)
npm test               # Run all tests with Jest
npm test -- --watch    # Run tests in watch mode
npm test -- path/to/test.spec.ts  # Run a single test file
npm run lint           # Run ESLint
npm run fix            # Run ESLint with auto-fix
npm run format         # Format code with Prettier
npm run format:check   # Check formatting without modifying
```

## Architecture

This is a GitHub Action that collects benchmark results from various tools and tracks them over time, optionally publishing to GitHub Pages.

### Core Flow

1. **`src/index.ts`** - Entry point that orchestrates the action
2. **`src/config.ts`** - Parses and validates action inputs from `action.yml`
3. **`src/extract.ts`** - Parses benchmark output from 12+ supported tools (cargo, go, benchmarkjs, pytest, googlecpp, catch2, julia, jmh, benchmarkdotnet, benchmarkluau, customBiggerIsBetter, customSmallerIsBetter)
4. **`src/write.ts`** - Handles result storage: commits to gh-pages branch, alerts on regressions, and generates dashboard HTML

### Key Types

- `BenchmarkResult` - Single benchmark measurement with name, value, unit, optional range/extra
- `Benchmark` - Collection of results tied to a commit
- `Config` - All action configuration from inputs

### Tool-Specific Extractors

Each benchmark tool has its own extraction function in `src/extract.ts` (e.g., `extractGoResult`, `extractCargoResult`, `extractBenchmarkJsResult`). These parse tool-specific output formats into the unified `BenchmarkResult[]` format.

### Comments and Alerts

`src/comment/` contains logic for posting benchmark comparisons as GitHub commit comments or PR comments when performance regresses beyond a threshold.

## Supported Benchmark Tools

The `tool` input accepts: `cargo`, `go`, `benchmarkjs`, `benchmarkluau`, `pytest`, `googlecpp`, `catch2`, `julia`, `jmh`, `benchmarkdotnet`, `customBiggerIsBetter`, `customSmallerIsBetter`

## Test Data

Test fixtures for each tool's output format are in `test/data/extract/`. Snapshot tests are in `test/__snapshots__/`.

## Plan Mode

- Make the plan extremely concise. Sacrifice grammar for the sake of concision.
- At the end of each plan, give me a list of unresolved questions to answer, if any.

## Implementation

- Avoid using the `as unknown as ExpectedType`. Instead use type assertions or make sure that the object complies with the expected type. 
