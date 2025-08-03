export function normalizeUnit(prevUnit: string, currentUnit: string, value: number): number {
    const prevUnitIndex = TIME_UNITS.indexOf(prevUnit);
    const currentUnitIndex = TIME_UNITS.indexOf(currentUnit);

    const unitDiff = prevUnitIndex - currentUnitIndex;

    return value * 1000 ** unitDiff;
}

const TIME_UNITS = ['s', 'ms', 'us', 'ns'];
