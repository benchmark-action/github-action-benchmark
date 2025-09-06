"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeValueByUnit = normalizeValueByUnit;
const canonicalizeUnit_1 = require("./canonicalizeUnit");
function normalizeValueByUnit(prevUnit, currentUnit, value) {
    const prev = (0, canonicalizeUnit_1.canonicalizeUnit)(prevUnit);
    const current = (0, canonicalizeUnit_1.canonicalizeUnit)(currentUnit);
    for (const units of SUPPORTED_UNITS) {
        const prevUnitIndex = units.indexOf(prev);
        const currentUnitIndex = units.indexOf(current);
        if (prevUnitIndex >= 0 && currentUnitIndex >= 0) {
            const unitDiff = prevUnitIndex - currentUnitIndex;
            return value * UNIT_CONVERSION_MULTIPLIER ** unitDiff;
        }
    }
    return value;
}
const UNIT_CONVERSION_MULTIPLIER = 1000;
const TIME_UNITS = ['s', 'ms', 'us', 'ns'];
const ITER_UNITS = TIME_UNITS.map((unit) => `${unit}/iter`);
const OPS_PER_TIME_UNIT = [...TIME_UNITS].reverse().map((unit) => `ops/${unit}`);
const SUPPORTED_UNITS = [TIME_UNITS, ITER_UNITS, OPS_PER_TIME_UNIT];
//# sourceMappingURL=normalizeValueByUnit.js.map