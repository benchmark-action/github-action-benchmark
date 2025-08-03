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

    it('should NOT extract range with unknown prefix', () => {
        expect(extractRangeInfo('unknown prefix 20')).toBeUndefined();
    });

    it('should NOT extract range with invalid number', () => {
        expect(extractRangeInfo('± boo')).toBeUndefined();
        expect(extractRangeInfo('+- boo')).toBeUndefined();
    });
});
