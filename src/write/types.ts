import { Benchmark } from '../extract';

export type BenchmarkSuites = { [name: string]: Benchmark[] };
export interface DataJson {
    lastUpdate: number;
    repoUrl: string;
    entries: BenchmarkSuites;
}
