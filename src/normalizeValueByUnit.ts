export function normalizeValueByUnit(prevUnit: string, currentUnit: string, value: number): number {
    for (const units of SUPPORTED_UNITS) {
        const prevUnitIndex = units.indexOf(prevUnit);
        const currentUnitIndex = units.indexOf(currentUnit);

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
