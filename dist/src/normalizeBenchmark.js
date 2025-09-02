"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeBenchmark = void 0;
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
exports.normalizeBenchmark = normalizeBenchmark;
//# sourceMappingURL=normalizeBenchmark.js.map