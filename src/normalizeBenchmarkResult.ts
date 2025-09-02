import { BenchmarkResult } from './extract';
import { normalizeValueByUnit } from './normalizeValueByUnit';
import { extractRangeInfo } from './extractRangeInfo';

export function normalizeBenchmarkResult(
    prevBenchResult: BenchmarkResult | undefined | null,
    currenBenchResult: BenchmarkResult,
): BenchmarkResult {
    if (!prevBenchResult) {
        return currenBenchResult;
    }

    const prevUnit = prevBenchResult.unit;
    const currentUnit = currenBenchResult.unit;
    const currentRange = currenBenchResult.range;
    const currentRangeInfo = extractRangeInfo(currentRange);

    const normalizedValue = normalizeValueByUnit(prevUnit, currentUnit, currenBenchResult.value);
    const normalizedUnit = currenBenchResult.value !== normalizedValue ? prevUnit : currentUnit;
    const normalizedRangeInfo = currentRangeInfo
        ? {
              prefix: currentRangeInfo.prefix,
              value: normalizeValueByUnit(prevUnit, currentUnit, currentRangeInfo.value),
          }
        : undefined;

    return {
        ...currenBenchResult,
        value: normalizedValue,
        unit: normalizedUnit,
        range: normalizedRangeInfo ? `${normalizedRangeInfo.prefix}${normalizedRangeInfo.value}` : currentRange,
    };
}
