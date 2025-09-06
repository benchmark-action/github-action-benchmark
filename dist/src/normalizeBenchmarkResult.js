"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeBenchmarkResult = normalizeBenchmarkResult;
const normalizeValueByUnit_1 = require("./normalizeValueByUnit");
const extractRangeInfo_1 = require("./extractRangeInfo");
function normalizeBenchmarkResult(prevBenchResult, currentBenchResult) {
    if (!prevBenchResult) {
        return currentBenchResult;
    }
    const prevUnit = prevBenchResult.unit;
    const currentUnit = currentBenchResult.unit;
    const currentRange = currentBenchResult.range;
    const currentRangeInfo = (0, extractRangeInfo_1.extractRangeInfo)(currentRange);
    const normalizedValue = (0, normalizeValueByUnit_1.normalizeValueByUnit)(prevUnit, currentUnit, currentBenchResult.value);
    const normalizedUnit = currentBenchResult.value !== normalizedValue ? prevUnit : currentUnit;
    const normalizedRangeInfo = currentRangeInfo
        ? {
            prefix: currentRangeInfo.prefix,
            value: (0, normalizeValueByUnit_1.normalizeValueByUnit)(prevUnit, currentUnit, currentRangeInfo.value),
        }
        : undefined;
    return {
        ...currentBenchResult,
        value: normalizedValue,
        unit: normalizedUnit,
        range: normalizedRangeInfo ? `${normalizedRangeInfo.prefix}${normalizedRangeInfo.value}` : currentRange,
    };
}
//# sourceMappingURL=normalizeBenchmarkResult.js.map