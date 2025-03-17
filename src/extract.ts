/* eslint-disable @typescript-eslint/naming-convention */
import { promises as fs } from 'fs';
import { Config } from './config';

export interface BenchmarkResult {
    name: string;
    value: number;
    range?: string;
    unit: string;
    extra?: string;
}

function extractCargoResult(output: string): BenchmarkResult[] {
    const lines = output.split(/\r?\n/g);
    const ret = [];
    const reExtract = /^test (.+)\s+\.\.\. bench:\s+([0-9,.]+) (\w+\/\w+) \(\+\/- ([0-9,.]+)\)$/;
    const reComma = /,/g;

    for (const line of lines) {
        const m = line.match(reExtract);
        if (m === null) {
            continue;
        }

        const name = m[1].trim();
        const value = parseFloat(m[2].replace(reComma, ''));
        const unit = m[3].trim();
        const range = m[4].replace(reComma, '');

        ret.push({
            name,
            value,
            range: `± ${range}`,
            unit: unit,
        });
    }

    return ret;
}

export async function localWriteBenchmark(benches: BenchmarkResult[], config: Config) {
    const data = JSON.stringify(benches);
    const outPath = config.jsonOutPath;
    await fs.writeFile(outPath, data);
}

export async function extractData(config: Config): Promise<BenchmarkResult[]> {
    const output = await fs.readFile(config.outputFilePath, 'utf8');
    const { tool } = config;
    let benches: BenchmarkResult[];

    switch (tool) {
        case 'cargo':
            benches = extractCargoResult(output);
            break;
        default:
            throw new Error(`FATAL: Unexpected tool: '${tool}'`);
    }

    if (benches.length === 0) {
        throw new Error(`No benchmark result was found in ${config.outputFilePath}. Benchmark output was '${output}'`);
    }

    return benches;
}
