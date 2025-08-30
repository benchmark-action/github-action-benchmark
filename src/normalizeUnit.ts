export function normalizeUnit(prevUnit: string, currentUnit: string, value: number): number {
    const prevUnitIndex = TIME_UNITS.indexOf(prevUnit);
    const currentUnitIndex = TIME_UNITS.indexOf(currentUnit);

    if (prevUnitIndex >= 0 && currentUnitIndex >= 0) {
        const unitDiff = prevUnitIndex - currentUnitIndex;

        return value * 1000 ** unitDiff;
    }

    const prevUnitIndex2 = ITER_UNITS.indexOf(prevUnit);
    const currentUnitIndex2 = ITER_UNITS.indexOf(currentUnit);

    if (prevUnitIndex2 >= 0 && currentUnitIndex2 >= 0) {
        const unitDiff = prevUnitIndex2 - currentUnitIndex2;

        return value * 1000 ** unitDiff;
    }

    const prevUnitIndex3 = OPS_PER_TIME_UNIT.indexOf(prevUnit);
    const currentUnitIndex3 = OPS_PER_TIME_UNIT.indexOf(currentUnit);

    if (prevUnitIndex3 >= 0 && currentUnitIndex3 >= 0) {
        const unitDiff = prevUnitIndex3 - currentUnitIndex3;

        return value * 1000 ** unitDiff;
    }

    return value;
}

const TIME_UNITS = ['s', 'ms', 'us', 'ns'];
const ITER_UNITS = TIME_UNITS.map((unit) => `${unit}/iter`);
const OPS_PER_TIME_UNIT = [...TIME_UNITS].reverse().map((unit) => `ops/${unit}`);
