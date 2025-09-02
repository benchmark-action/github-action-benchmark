import { Benchmark } from './extract';
import { normalizeBenchmarkResult } from './normalizeBenchmarkResult';

export function normalizeBenchmark(prevBench: Benchmark | null, currentBench: Benchmark): Benchmark {
    if (!prevBench) {
        return currentBench;
    }

    return {
        ...currentBench,
        benches: currentBench.benches
            .map((currentBenchResult) => ({
                currentBenchResult,
                prevBenchResult: prevBench.benches.find((result) => result.name === currentBenchResult.name),
            }))
            .map(({ currentBenchResult, prevBenchResult }) =>
                normalizeBenchmarkResult(prevBenchResult, currentBenchResult),
            ),
    };
}
