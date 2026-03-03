// Mock modules before imports
const mockDebug = jest.fn();
const mockFindPreviousBenchmark = jest.fn();
const mockFindInsertionIndex = jest.fn();

jest.mock('@actions/core', () => ({
    debug: mockDebug,
}));

const mockAnalyzerInstance = {
    findPreviousBenchmark: mockFindPreviousBenchmark,
    findInsertionIndex: mockFindInsertionIndex,
};

jest.mock('../src/gitGraph', () => ({
    GitGraphAnalyzer: {
        getInstance: jest.fn(() => mockAnalyzerInstance),
    },
}));

import { addBenchmarkEntry } from '../src/addBenchmarkEntry';
import { Benchmark } from '../src/extract';
import { BenchmarkSuites } from '../src/write';

describe('addBenchmarkEntry with Git Graph', () => {
    const createMockBenchmark = (id: string, timestamp?: string): Benchmark => ({
        commit: {
            id,
            timestamp: timestamp ?? '2025-01-01T00:00:00Z',
            message: `Commit ${id}`,
            url: `https://github.com/test/repo/commit/${id}`,
            author: { username: 'testuser' },
            committer: { username: 'testuser' },
        },
        date: Date.now(),
        tool: 'cargo',
        benches: [
            {
                name: 'test_bench',
                value: 100,
                unit: 'ms',
            },
        ],
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should use git graph analyzer to find previous benchmark', () => {
        const benchName = 'test-suite';
        const benchEntry = createMockBenchmark('abc123');
        const existingEntry = createMockBenchmark('def456');
        const entries = {
            [benchName]: [existingEntry],
        };

        mockFindPreviousBenchmark.mockReturnValue(existingEntry);
        mockFindInsertionIndex.mockReturnValue(1);

        const result = addBenchmarkEntry(benchName, benchEntry, entries, null);

        expect(mockFindPreviousBenchmark).toHaveBeenCalledWith(expect.arrayContaining([existingEntry]), 'abc123');
        expect(mockDebug).toHaveBeenCalledWith('Finding previous benchmark for commit: abc123');
        expect(mockDebug).toHaveBeenCalledWith('Found previous benchmark: def456');
        expect(result.prevBench).toBe(existingEntry);
    });

    it('should handle no previous benchmark found', () => {
        const benchName = 'test-suite';
        const benchEntry = createMockBenchmark('abc123');
        const existingEntry = createMockBenchmark('def456');
        const entries = {
            [benchName]: [existingEntry],
        };

        mockFindPreviousBenchmark.mockReturnValue(null);
        mockFindInsertionIndex.mockReturnValue(1);

        const result = addBenchmarkEntry(benchName, benchEntry, entries, null);

        expect(mockDebug).toHaveBeenCalledWith('Finding previous benchmark for commit: abc123');
        expect(mockDebug).toHaveBeenCalledWith('No previous benchmark found');
        expect(result.prevBench).toBeNull();
    });

    it('should create new benchmark suite when none exists', () => {
        const benchName = 'test-suite';
        const benchEntry = createMockBenchmark('abc123');
        const entries: BenchmarkSuites = {};

        mockFindPreviousBenchmark.mockReturnValue(null);

        const result = addBenchmarkEntry(benchName, benchEntry, entries, null);

        expect(entries[benchName]).toEqual([benchEntry]);
        expect(result.prevBench).toBeNull();
        expect(result.normalizedCurrentBench).toBe(benchEntry);
        expect(mockDebug).toHaveBeenCalledWith(
            "No suite was found for benchmark 'test-suite' in existing data. Created",
        );
    });

    it('should add to existing benchmark suite', () => {
        const benchName = 'test-suite';
        const benchEntry = createMockBenchmark('abc123');
        const existingEntry = createMockBenchmark('def456');
        const entries = {
            [benchName]: [existingEntry],
        };

        mockFindPreviousBenchmark.mockReturnValue(existingEntry);
        mockFindInsertionIndex.mockReturnValue(1);

        const result = addBenchmarkEntry(benchName, benchEntry, entries, null);

        expect(entries[benchName]).toHaveLength(2);
        expect(entries[benchName][1]).toEqual(
            expect.objectContaining({
                commit: benchEntry.commit,
                tool: benchEntry.tool,
            }),
        );
        expect(result.prevBench).toBe(existingEntry);
    });

    it('should respect maxItems limit', () => {
        const benchName = 'test-suite';
        const benchEntry = createMockBenchmark('new123');
        const oldEntries = [createMockBenchmark('old1'), createMockBenchmark('old2'), createMockBenchmark('old3')];
        const entries = {
            [benchName]: oldEntries,
        };

        mockFindPreviousBenchmark.mockReturnValue(oldEntries[oldEntries.length - 1]);
        mockFindInsertionIndex.mockReturnValue(3);

        addBenchmarkEntry(benchName, benchEntry, entries, 3);

        // Should have 3 items total (maxItems)
        expect(entries[benchName]).toHaveLength(3);
        expect(entries[benchName][2]).toEqual(
            expect.objectContaining({
                commit: benchEntry.commit,
                tool: benchEntry.tool,
            }),
        );
        // Should have removed oldest entries to maintain maxItems
        // We started with 3 old entries + 1 new = 4, so maxItems=3 keeps the 3 most recent
        expect(entries[benchName]).toHaveLength(3);
        // The oldest entry (old1) should have been removed
        expect(entries[benchName].map((e) => e.commit.id)).not.toContain('old1');
        expect(mockDebug).toHaveBeenCalledWith(
            "Number of data items for 'test-suite' was truncated to 3 due to max-items-in-charts",
        );
    });

    it('should not truncate when under maxItems limit', () => {
        const benchName = 'test-suite';
        const benchEntry = createMockBenchmark('new123');
        const oldEntries = [createMockBenchmark('old1')];
        const entries = {
            [benchName]: oldEntries,
        };

        mockFindPreviousBenchmark.mockReturnValue(oldEntries[0]);
        mockFindInsertionIndex.mockReturnValue(1);

        addBenchmarkEntry(benchName, benchEntry, entries, 5);

        expect(entries[benchName]).toHaveLength(2);
        // Should not call debug about truncation
        expect(mockDebug).not.toHaveBeenCalledWith(expect.stringContaining('was truncated to'));
    });
});
