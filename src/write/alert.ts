import { BenchmarkResult } from '../extract';

export interface Alert {
    current: BenchmarkResult;
    prev: BenchmarkResult;
    ratio: number;
}
