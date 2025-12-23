// Mock modules before imports
const mockDebug = jest.fn();
const mockWarning = jest.fn();
const mockExecSync = jest.fn();

jest.mock('@actions/core', () => ({
    debug: mockDebug,
    warning: mockWarning,
}));

jest.mock('child_process', () => ({
    execSync: mockExecSync,
}));

const mockGitHubContext = {
    repo: {
        repo: 'test-repo',
        owner: 'test-owner',
    },
    payload: {},
    ref: '',
};

jest.mock('@actions/github', () => ({
    get context() {
        return mockGitHubContext;
    },
}));

import { GitGraphAnalyzer } from '../src/gitGraph';
import { Benchmark } from '../src/extract';

describe('GitGraphAnalyzer', () => {
    let analyzer: GitGraphAnalyzer;
    const originalEnv = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        // Reset environment
        process.env = { ...originalEnv };
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    describe('constructor', () => {
        it('should detect GitHub Actions environment', () => {
            process.env.GITHUB_ACTIONS = 'true';
            process.env.GITHUB_WORKSPACE = '/github/workspace';

            analyzer = new GitGraphAnalyzer();
            // We can't directly access the private property, but we can test behavior
            expect(analyzer).toBeInstanceOf(GitGraphAnalyzer);
        });

        it('should detect non-GitHub Actions environment', () => {
            delete process.env.GITHUB_ACTIONS;

            analyzer = new GitGraphAnalyzer();
            expect(analyzer).toBeInstanceOf(GitGraphAnalyzer);
        });
    });

    describe('getCurrentBranch', () => {
        beforeEach(() => {
            analyzer = new GitGraphAnalyzer();
        });

        it('should get branch from pull request head ref', () => {
            mockGitHubContext.payload = {
                pull_request: {
                    head: {
                        ref: 'feature-branch',
                    },
                },
            };

            expect(analyzer.getCurrentBranch()).toBe('feature-branch');
        });

        it('should get branch from ref (push event)', () => {
            mockGitHubContext.payload = {};
            mockGitHubContext.ref = 'refs/heads/main';

            expect(analyzer.getCurrentBranch()).toBe('main');
        });

        it('should fallback to main when no branch detected', () => {
            mockGitHubContext.payload = {};
            mockGitHubContext.ref = '';

            expect(analyzer.getCurrentBranch()).toBe('main');
        });
    });

    describe('getBranchAncestry', () => {
        beforeEach(() => {
            process.env.GITHUB_ACTIONS = 'true';
            process.env.GITHUB_WORKSPACE = '/github/workspace';
            analyzer = new GitGraphAnalyzer();
        });

        it('should parse git log output correctly', () => {
            mockExecSync.mockReturnValue('abc123 Commit message 1\ndef456 Commit message 2\nghi789 Commit message 3');

            const ancestry = analyzer.getBranchAncestry('main');

            expect(mockExecSync).toHaveBeenCalledWith(
                'git log --oneline --topo-order main',
                expect.objectContaining({
                    encoding: 'utf8',
                    cwd: '/github/workspace',
                }),
            );
            expect(ancestry).toEqual(['abc123', 'def456', 'ghi789']);
        });

        it('should handle empty git log output', () => {
            mockExecSync.mockReturnValue('');

            const ancestry = analyzer.getBranchAncestry('main');
            expect(ancestry).toEqual([]);
        });

        it('should handle git command failure', () => {
            mockExecSync.mockImplementation(() => {
                throw new Error('Git command failed');
            });

            const ancestry = analyzer.getBranchAncestry('main');
            expect(ancestry).toEqual([]);
            expect(mockWarning).toHaveBeenCalledWith(expect.stringContaining('Failed to get ancestry for ref main'));
        });

        it('should return empty array when git CLI not available', () => {
            delete process.env.GITHUB_ACTIONS;
            analyzer = new GitGraphAnalyzer();

            const ancestry = analyzer.getBranchAncestry('main');
            expect(ancestry).toEqual([]);
            expect(mockWarning).toHaveBeenCalledWith('Git CLI not available, cannot determine ancestry');
        });
    });

    describe('findPreviousBenchmark', () => {
        const createMockBenchmark = (id: string, timestamp: string): Benchmark => ({
            commit: {
                id,
                timestamp,
                message: `Commit ${id}`,
                url: `https://github.com/test/repo/commit/${id}`,
                author: { username: 'testuser' },
                committer: { username: 'testuser' },
            },
            date: Date.now(),
            tool: 'cargo',
            benches: [],
        });

        beforeEach(() => {
            process.env.GITHUB_ACTIONS = 'true';
            process.env.GITHUB_WORKSPACE = '/github/workspace';
            analyzer = new GitGraphAnalyzer();
        });

        it('should find previous benchmark using git ancestry', () => {
            const suites = [
                createMockBenchmark('abc123', '2025-01-01T00:00:00Z'),
                createMockBenchmark('def456', '2025-01-02T00:00:00Z'),
                createMockBenchmark('ghi789', '2025-01-03T00:00:00Z'),
            ];

            mockExecSync.mockReturnValue('ghi789 Commit 3\ndef456 Commit 2\nabc123 Commit 1');

            const result = analyzer.findPreviousBenchmark(suites, 'ghi789', 'main');

            expect(result?.commit.id).toBe('def456');
            expect(result?.commit.timestamp).toBe('2025-01-02T00:00:00Z');
            expect(mockDebug).toHaveBeenCalledWith('Found previous benchmark: def456 based on git ancestry');
        });

        it('should return null when no previous benchmark found', () => {
            const suites = [createMockBenchmark('abc123', '2025-01-01T00:00:00Z')];

            mockExecSync.mockReturnValue('abc123 Commit 1');

            const result = analyzer.findPreviousBenchmark(suites, 'abc123', 'main');

            expect(result).toBeNull();
            expect(mockDebug).toHaveBeenCalledWith('No previous benchmark found in git ancestry');
        });

        it('should fallback to execution time when git command fails', () => {
            const suites = [
                createMockBenchmark('abc123', '2025-01-01T00:00:00Z'),
                createMockBenchmark('def456', '2025-01-02T00:00:00Z'),
            ];

            mockExecSync.mockImplementation(() => {
                throw new Error('Git failed');
            });

            const result = analyzer.findPreviousBenchmark(suites, 'def456', 'main');

            // Should fallback to execution time logic (previous in array)
            expect(result?.commit.id).toBe('abc123');
            expect(result?.commit.timestamp).toBe('2025-01-01T00:00:00Z');
        });

        it('should fallback to execution time when current commit not in ancestry', () => {
            const suites = [
                createMockBenchmark('abc123', '2025-01-01T00:00:00Z'),
                createMockBenchmark('def456', '2025-01-02T00:00:00Z'),
            ];

            mockExecSync.mockReturnValue('xyz999 Other commit');

            const result = analyzer.findPreviousBenchmark(suites, 'def456', 'main');

            // Should fallback to execution time logic
            expect(result?.commit.id).toBe('abc123');
            expect(result?.commit.timestamp).toBe('2025-01-01T00:00:00Z');
        });
    });

    describe('sortByGitOrder', () => {
        const createMockBenchmark = (id: string, timestamp: string): Benchmark => ({
            commit: {
                id,
                timestamp,
                message: `Commit ${id}`,
                url: `https://github.com/test/repo/commit/${id}`,
                author: { username: 'testuser' },
                committer: { username: 'testuser' },
            },
            date: Date.now(),
            tool: 'cargo',
            benches: [],
        });

        beforeEach(() => {
            analyzer = new GitGraphAnalyzer();
        });

        it('should sort by commit timestamp', () => {
            const suites = [
                createMockBenchmark('c', '2025-01-03T00:00:00Z'),
                createMockBenchmark('a', '2025-01-01T00:00:00Z'),
                createMockBenchmark('b', '2025-01-02T00:00:00Z'),
            ];

            const result = analyzer.sortByGitOrder(suites);

            expect(result.map((b) => b.commit.id)).toEqual(['a', 'b', 'c']);
            expect(mockDebug).toHaveBeenCalledWith('Sorted benchmarks by commit timestamp (GitHub Pages mode)');
        });

        it('should handle empty array', () => {
            const result = analyzer.sortByGitOrder([]);
            expect(result).toEqual([]);
        });

        it('should maintain original order for equal timestamps', () => {
            const suites = [
                createMockBenchmark('a', '2025-01-01T00:00:00Z'),
                createMockBenchmark('b', '2025-01-01T00:00:00Z'),
            ];

            const result = analyzer.sortByGitOrder(suites);

            expect(result.map((b) => b.commit.id)).toEqual(['a', 'b']);
        });
    });
});
