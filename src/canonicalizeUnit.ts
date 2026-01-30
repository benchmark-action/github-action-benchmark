export function canonicalizeUnit(u: string): string {
    return u.trim().toLowerCase().replace(/µs|μs/g, 'us');
}
