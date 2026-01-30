import { BenchmarkResult } from './extract';
import { normalizeValueByUnit } from './normalizeValueByUnit';
import { extractRangeInfo } from './extractRangeInfo';

export function normalizeBenchmarkResult(
    prevBenchResult: BenchmarkResult | undefined | null,
    currentBenchResult: BenchmarkResult,
): BenchmarkResult {
    if (!prevBenchResult) {
        return currentBenchResult;
    }

    const prevUnit = prevBenchResult.unit;
    const currentUnit = currentBenchResult.unit;
    const currentRange = currentBenchResult.range;
    const currentRangeInfo = extractRangeInfo(currentRange);

    const normalizedValue = normalizeValueByUnit(prevUnit, currentUnit, currentBenchResult.value);
    const normalizedUnit = currentBenchResult.value !== normalizedValue ? prevUnit : currentUnit;
    const normalizedRangeInfo = currentRangeInfo
        ? {
              prefix: currentRangeInfo.prefix,
              value: normalizeValueByUnit(prevUnit, currentUnit, currentRangeInfo.value),
          }
        : undefined;

    return {
        ...currentBenchResult,
        value: normalizedValue,
        unit: normalizedUnit,
        range: normalizedRangeInfo ? `${normalizedRangeInfo.prefix}${normalizedRangeInfo.value}` : currentRange,
    };
}
