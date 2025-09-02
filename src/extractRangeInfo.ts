export function extractRangeInfo(range: string | undefined): { prefix: string; value: number } | undefined {
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
        prefix: matches.groups.prefix ?? '',
    };
}
