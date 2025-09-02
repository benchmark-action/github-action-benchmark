import { normalizeBenchmarkResult } from '../src/normalizeBenchmarkResult';

describe('normalizeBenchmarkResult', () => {
    describe('with range (±)', () => {
        it('normalize smaller when new unit is larger', () => {
            expect(
                normalizeBenchmarkResult(
                    { name: 'Bench', value: 900, unit: 'ms', range: '± 20' },
                    { name: 'Bench', value: 1.01, unit: 's', range: '± 0.1' },
                ),
            ).toEqual({ name: 'Bench', value: 1_010, unit: 'ms', range: '± 100' });
            expect(
                normalizeBenchmarkResult(
                    { name: 'Bench', value: 900, unit: 'us', range: '± 20' },
                    { name: 'Bench', value: 1.01, unit: 's', range: '± 0.1' },
                ),
            ).toEqual({ name: 'Bench', value: 1_010_000, unit: 'us', range: '± 100000' });
            expect(
                normalizeBenchmarkResult(
                    { name: 'Bench', value: 900, unit: 'ns', range: '± 20' },
                    { name: 'Bench', value: 1.01, unit: 's', range: '± 0.1' },
                ),
            ).toEqual({ name: 'Bench', value: 1_010_000_000, unit: 'ns', range: '± 100000000' });

            expect(
                normalizeBenchmarkResult(
                    { name: 'Bench', value: 900, unit: 'ms/iter', range: '± 20' },
                    { name: 'Bench', value: 1.01, unit: 's/iter', range: '± 0.1' },
                ),
            ).toEqual({ name: 'Bench', value: 1_010, unit: 'ms/iter', range: '± 100' });
            expect(
                normalizeBenchmarkResult(
                    { name: 'Bench', value: 900, unit: 'us/iter', range: '± 20' },
                    { name: 'Bench', value: 1.01, unit: 's/iter', range: '± 0.1' },
                ),
            ).toEqual({ name: 'Bench', value: 1_010_000, unit: 'us/iter', range: '± 100000' });
            expect(
                normalizeBenchmarkResult(
                    { name: 'Bench', value: 900, unit: 'ns/iter', range: '± 20' },
                    { name: 'Bench', value: 1.01, unit: 's/iter', range: '± 0.1' },
                ),
            ).toEqual({ name: 'Bench', value: 1_010_000_000, unit: 'ns/iter', range: '± 100000000' });
        });

        it('normalize smaller when new unit is smaller', () => {
            expect(
                normalizeBenchmarkResult(
                    { name: 'Bench', value: 1.01, unit: 's', range: '± 0.1' },
                    { name: 'Bench', value: 900, unit: 'ms', range: '± 20' },
                ),
            ).toEqual({ name: 'Bench', value: 0.9, unit: 's', range: '± 0.02' });
            expect(
                normalizeBenchmarkResult(
                    { name: 'Bench', value: 10_000.01, unit: 's', range: '± 10' },
                    { name: 'Bench', value: 9_000_000, unit: 'us', range: '± 2000000' },
                ),
            ).toEqual({ name: 'Bench', value: 9, unit: 's', range: '± 2' });

            expect(
                normalizeBenchmarkResult(
                    { name: 'Bench', value: 1.01, unit: 's/iter', range: '± 0.1' },
                    { name: 'Bench', value: 900, unit: 'ms/iter', range: '± 20' },
                ),
            ).toEqual({ name: 'Bench', value: 0.9, unit: 's/iter', range: '± 0.02' });
            expect(
                normalizeBenchmarkResult(
                    { name: 'Bench', value: 10_000.01, unit: 's/iter', range: '± 10' },
                    { name: 'Bench', value: 9_000_000, unit: 'us/iter', range: '± 2000000' },
                ),
            ).toEqual({ name: 'Bench', value: 9, unit: 's/iter', range: '± 2' });
        });

        it('NOT normalize when new unit is not supported', () => {
            expect(
                normalizeBenchmarkResult(
                    { name: 'Bench', value: 900, unit: 'unknown1', range: '± 20' },
                    { name: 'Bench', value: 1.01, unit: 'unknown2', range: '± 0.1' },
                ),
            ).toEqual({ name: 'Bench', value: 1.01, unit: 'unknown2', range: '± 0.1' });
        });
    });

    describe('with range (+-)', () => {
        it('normalize smaller when new unit is larger', () => {
            expect(
                normalizeBenchmarkResult(
                    { name: 'Bench', value: 900, unit: 'ms', range: '+- 20' },
                    { name: 'Bench', value: 1.01, unit: 's', range: '+- 0.1' },
                ),
            ).toEqual({ name: 'Bench', value: 1_010, unit: 'ms', range: '+- 100' });
            expect(
                normalizeBenchmarkResult(
                    { name: 'Bench', value: 900, unit: 'us', range: '+- 20' },
                    { name: 'Bench', value: 1.01, unit: 's', range: '+- 0.1' },
                ),
            ).toEqual({ name: 'Bench', value: 1_010_000, unit: 'us', range: '+- 100000' });
            expect(
                normalizeBenchmarkResult(
                    { name: 'Bench', value: 900, unit: 'ns', range: '+- 20' },
                    { name: 'Bench', value: 1.01, unit: 's', range: '+- 0.1' },
                ),
            ).toEqual({ name: 'Bench', value: 1_010_000_000, unit: 'ns', range: '+- 100000000' });
        });

        it('normalize smaller when new unit is smaller', () => {
            expect(
                normalizeBenchmarkResult(
                    { name: 'Bench', value: 1.01, unit: 's', range: '+- 0.1' },
                    { name: 'Bench', value: 900, unit: 'ms', range: '+- 20' },
                ),
            ).toEqual({ name: 'Bench', value: 0.9, unit: 's', range: '+- 0.02' });
            expect(
                normalizeBenchmarkResult(
                    { name: 'Bench', value: 10_000.01, unit: 's', range: '+- 10' },
                    { name: 'Bench', value: 9_000_000, unit: 'us', range: '+- 2000000' },
                ),
            ).toEqual({ name: 'Bench', value: 9, unit: 's', range: '+- 2' });
        });

        it('NOT normalize when new unit is not supported', () => {
            expect(
                normalizeBenchmarkResult(
                    { name: 'Bench', value: 900, unit: 'unknown1', range: '± 20' },
                    { name: 'Bench', value: 1.01, unit: 'unknown2', range: '± 0.1' },
                ),
            ).toEqual({ name: 'Bench', value: 1.01, unit: 'unknown2', range: '± 0.1' });
        });
    });

    describe('without range', () => {
        it('normalize smaller when new unit is larger', () => {
            expect(
                normalizeBenchmarkResult(
                    { name: 'Bench', value: 900, unit: 'ms' },
                    { name: 'Bench', value: 1.01, unit: 's' },
                ),
            ).toEqual({ name: 'Bench', value: 1_010, unit: 'ms' });
            expect(
                normalizeBenchmarkResult(
                    { name: 'Bench', value: 900, unit: 'us' },
                    { name: 'Bench', value: 1.01, unit: 's' },
                ),
            ).toEqual({ name: 'Bench', value: 1_010_000, unit: 'us' });
            expect(
                normalizeBenchmarkResult(
                    { name: 'Bench', value: 900, unit: 'ns' },
                    { name: 'Bench', value: 1.01, unit: 's' },
                ),
            ).toEqual({ name: 'Bench', value: 1_010_000_000, unit: 'ns' });
        });

        it('normalize smaller when new unit is smaller', () => {
            expect(
                normalizeBenchmarkResult(
                    { name: 'Bench', value: 1.01, unit: 's' },
                    { name: 'Bench', value: 900, unit: 'ms' },
                ),
            ).toEqual({ name: 'Bench', value: 0.9, unit: 's' });
            expect(
                normalizeBenchmarkResult(
                    { name: 'Bench', value: 10_000.01, unit: 's' },
                    { name: 'Bench', value: 9_000_000, unit: 'us' },
                ),
            ).toEqual({ name: 'Bench', value: 9, unit: 's' });
        });

        it('NOT normalize when new unit is not supported', () => {
            expect(
                normalizeBenchmarkResult(
                    { name: 'Bench', value: 900, unit: 'unknown1' },
                    { name: 'Bench', value: 1.01, unit: 'unknown2' },
                ),
            ).toEqual({ name: 'Bench', value: 1.01, unit: 'unknown2' });
        });
    });
});
