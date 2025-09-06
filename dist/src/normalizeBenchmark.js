"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeBenchmark = normalizeBenchmark;
const normalizeBenchmarkResult_1 = require("./normalizeBenchmarkResult");
function normalizeBenchmark(prevBench, currentBench) {
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
            .map(({ currentBenchResult, prevBenchResult }) => (0, normalizeBenchmarkResult_1.normalizeBenchmarkResult)(prevBenchResult, currentBenchResult)),
    };
}
//# sourceMappingURL=normalizeBenchmark.js.map