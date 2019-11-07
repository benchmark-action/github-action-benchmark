import { promises as fs } from 'fs';
import * as github from '@actions/github';
import { Config } from './config';

export interface BenchmarkResult {
    name: string;
    value: number;
    diff?: number;
    unit: string;
}

export interface Benchmark {
    commit: string;
    date: number;
    benches: BenchmarkResult[];
}

function extractCargoResult(output: string): BenchmarkResult[] {
    const lines = output.split('\n');
    const ret = [];
    const reExtract = /^test (\w+)\s+\.\.\. bench:\s+([0-9,]+) ns\/iter \(\+\/- ([0-9,]+)\)$/;
    const reComma = /,/g;

    for (const line of lines) {
        const m = line.match(reExtract);
        if (m === null) {
            continue;
        }

        const name = m[1];
        const value = parseInt(m[2].replace(reComma, ''), 10);
        const diff = parseInt(m[3].replace(reComma, ''), 10);

        ret.push({
            name,
            value,
            diff,
            unit: 'ns/iter',
        });
    }

    return ret;
}

export async function extractResult(config: Config): Promise<Benchmark> {
    const output = await fs.readFile(config.outputFilePath, 'utf8');
    const { tool } = config;
    let benches;

    switch (tool) {
        case 'cargo':
            benches = extractCargoResult(output);
        default:
            throw new Error(`FATAL: Unexpected tool: ${tool}`);
    }

    if (benches.length === 0) {
        throw new Error(`No benchmark result was found in ${config.outputFilePath}. Benchmark output was '${output}'`);
    }

    return {
        commit: github.context.payload.id,
        date: Date.now(),
        benches,
    };
}
