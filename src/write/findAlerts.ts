import { Benchmark } from '../extract';
import * as core from '@actions/core';
import { biggerIsBetter } from './biggerIsBetter';
import { Alert } from './alert';

export function findAlerts(curSuite: Benchmark, prevSuite: Benchmark, threshold: number): Alert[] {
    core.debug(`Comparing current:${curSuite.commit.id} and prev:${prevSuite.commit.id} for alert`);

    const alerts = [];
    for (const current of curSuite.benches) {
        const prev = prevSuite.benches.find((b) => b.name === current.name);
        if (prev === undefined) {
            core.debug(`Skipped because benchmark '${current.name}' is not found in previous benchmarks`);
            continue;
        }

        const ratio = biggerIsBetter(curSuite.tool)
            ? prev.value / current.value // e.g. current=100, prev=200
            : current.value / prev.value; // e.g. current=200, prev=100

        if (ratio > threshold) {
            core.warning(
                `Performance alert! Previous value was ${prev.value} and current value is ${current.value}.` +
                    ` It is ${ratio}x worse than previous exceeding a ratio threshold ${threshold}`,
            );
            alerts.push({ current, prev, ratio });
        }
    }

    return alerts;
}
