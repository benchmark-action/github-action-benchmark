import { extractRangeInfo } from '../src/extractRangeInfo';

describe('extractRangeInfo', () => {
    it("should extract range with '±'", () => {
        expect(extractRangeInfo('±20')).toEqual({ value: 20, prefix: '±' });
    });

    it("should extract range with '± '", () => {
        expect(extractRangeInfo('± 20')).toEqual({ value: 20, prefix: '± ' });
    });

    it("should extract range with '+-'", () => {
        expect(extractRangeInfo('+-20')).toEqual({ value: 20, prefix: '+-' });
    });

    it("should extract range with '+- '", () => {
        expect(extractRangeInfo('+- 20')).toEqual({ value: 20, prefix: '+- ' });
    });

    it('should extract single-digit integer', () => {
        expect(extractRangeInfo('±2')).toEqual({ value: 2, prefix: '±' });
    });
    it('should extract decimal and preserve prefix space', () => {
        expect(extractRangeInfo('± 0.5')).toEqual({ value: 0.5, prefix: '± ' });
    });
    it('should extract scientific notation', () => {
        expect(extractRangeInfo('+-1e-3')).toEqual({ value: 1e-3, prefix: '+-' });
    });
    it('should tolerate surrounding whitespace', () => {
        expect(extractRangeInfo('  ±20  ')).toEqual({ value: 20, prefix: '±' });
    });

    it('should NOT extract range with unknown prefix', () => {
        expect(extractRangeInfo('unknown prefix 20')).toBeUndefined();
    });

    it('should NOT extract range with invalid number', () => {
        expect(extractRangeInfo('± boo')).toBeUndefined();
        expect(extractRangeInfo('+- boo')).toBeUndefined();
        expect(extractRangeInfo('± 1boo')).toBeUndefined();
        expect(extractRangeInfo('+- 1boo')).toBeUndefined();
    });
});
