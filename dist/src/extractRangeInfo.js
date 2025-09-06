"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractRangeInfo = extractRangeInfo;
function extractRangeInfo(range) {
    var _a;
    if (!range) {
        return undefined;
    }
    const matches = range.match(/(?<prefix>(\+-|±)\s*)(?<value>\d.*)/);
    if (!matches || !matches.groups) {
        return undefined;
    }
    const valueString = matches.groups.value;
    const value = Number(valueString);
    if (isNaN(value)) {
        return undefined;
    }
    return {
        value,
        prefix: (_a = matches.groups.prefix) !== null && _a !== void 0 ? _a : '',
    };
}
//# sourceMappingURL=extractRangeInfo.js.map