import { normalizeUnit } from '../src/normalizeUnit';

describe('normalizeUnit', () => {
    it('normalize smaller when new unit is larger - time units', () => {
        expect(normalizeUnit('ms', 's', 12)).toBe(12_000);
        expect(normalizeUnit('us', 's', 12)).toBe(12_000_000);
        expect(normalizeUnit('ns', 's', 12)).toBe(12_000_000_000);
    });

    it('normalize smaller when new unit is smaller - time units', () => {
        expect(normalizeUnit('s', 'ms', 12)).toBe(0.012);
        expect(normalizeUnit('s', 'us', 12)).toBe(0.000_012);
        expect(normalizeUnit('s', 'ns', 12_000_000_000)).toBe(12);
    });

    it('normalize smaller when new unit is larger - iter units', () => {
        expect(normalizeUnit('ms/iter', 's/iter', 12)).toBe(12_000);
        expect(normalizeUnit('us/iter', 's/iter', 12)).toBe(12_000_000);
        expect(normalizeUnit('ns/iter', 's/iter', 12)).toBe(12_000_000_000);
    });

    it('normalize smaller when new unit is smaller - iter units', () => {
        expect(normalizeUnit('s/iter', 'ms/iter', 12)).toBe(0.012);
        expect(normalizeUnit('s/iter', 'us/iter', 12)).toBe(0.000_012);
        expect(normalizeUnit('s/iter', 'ns/iter', 12_000_000_000)).toBe(12);
    });

    it('normalize smaller when new unit is smaller - ops per time units', () => {
        expect(normalizeUnit('ops/ms', 'ops/s', 12)).toBe(0.012);
        expect(normalizeUnit('ops/us', 'ops/s', 12)).toBe(0.000_012);
        expect(normalizeUnit('ops/ns', 'ops/s', 12_000_000_000)).toBe(12);
    });

    it('normalize smaller when new unit is larger - ops per time units', () => {
        expect(normalizeUnit('ops/s', 'ops/ms', 12)).toBe(12_000);
        expect(normalizeUnit('ops/s', 'ops/us', 12)).toBe(12_000_000);
        expect(normalizeUnit('ops/s', 'ops/ns', 12)).toBe(12_000_000_000);
    });

    it('NOT normalize when new unit is not supported', () => {
        expect(normalizeUnit('unknown1', 'unknown2', 12)).toBe(12);
    });
});
