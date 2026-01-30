import { normalizeValueByUnit } from '../src/normalizeValueByUnit';

describe('normalizeValueByUnit', () => {
    it('normalize smaller when new unit is larger - time units', () => {
        expect(normalizeValueByUnit('ms', 's', 12)).toBe(12_000);
        expect(normalizeValueByUnit('us', 's', 12)).toBe(12_000_000);
        expect(normalizeValueByUnit('ns', 's', 12)).toBe(12_000_000_000);
    });

    it('normalize smaller when new unit is smaller - time units', () => {
        expect(normalizeValueByUnit('s', 'ms', 12)).toBe(0.012);
        expect(normalizeValueByUnit('s', 'us', 12)).toBe(0.000_012);
        expect(normalizeValueByUnit('s', 'ns', 12_000_000_000)).toBe(12);
    });

    it('normalize smaller when new unit is larger - iter units', () => {
        expect(normalizeValueByUnit('ms/iter', 's/iter', 12)).toBe(12_000);
        expect(normalizeValueByUnit('us/iter', 's/iter', 12)).toBe(12_000_000);
        expect(normalizeValueByUnit('ns/iter', 's/iter', 12)).toBe(12_000_000_000);
    });

    it('normalize smaller when new unit is smaller - iter units', () => {
        expect(normalizeValueByUnit('s/iter', 'ms/iter', 12)).toBe(0.012);
        expect(normalizeValueByUnit('s/iter', 'us/iter', 12)).toBe(0.000_012);
        expect(normalizeValueByUnit('s/iter', 'ns/iter', 12_000_000_000)).toBe(12);
    });

    it('normalize smaller when new unit is smaller - ops per time units', () => {
        expect(normalizeValueByUnit('ops/ms', 'ops/s', 12)).toBe(0.012);
        expect(normalizeValueByUnit('ops/us', 'ops/s', 12)).toBe(0.000_012);
        expect(normalizeValueByUnit('ops/ns', 'ops/s', 12_000_000_000)).toBe(12);
    });

    it('normalize smaller when new unit is larger - ops per time units', () => {
        expect(normalizeValueByUnit('ops/s', 'ops/ms', 12)).toBe(12_000);
        expect(normalizeValueByUnit('ops/s', 'ops/us', 12)).toBe(12_000_000);
        expect(normalizeValueByUnit('ops/s', 'ops/ns', 12)).toBe(12_000_000_000);
    });

    it('handles microsecond symbol variants', () => {
        expect(normalizeValueByUnit('ms', 'µs', 12)).toBe(0.012);
        expect(normalizeValueByUnit('ms', 'μs', 12)).toBe(0.012);
        expect(normalizeValueByUnit('us', 'µs', 12)).toBe(12);
        expect(normalizeValueByUnit('us', 'μs', 12)).toBe(12);
        expect(normalizeValueByUnit('µs', 'μs', 12)).toBe(12);
        expect(normalizeValueByUnit('ops/µs', 'ops/s', 12_000_000)).toBe(12);
    });
    it('tolerates surrounding whitespace and case', () => {
        expect(normalizeValueByUnit(' S ', ' MS ', 12)).toBe(0.012);
    });

    it('NOT normalize when new unit is not supported', () => {
        expect(normalizeValueByUnit('unknown1', 'unknown2', 12)).toBe(12);
    });
});
