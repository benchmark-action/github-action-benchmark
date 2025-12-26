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
        it('should detect git CLI availability', () => {
            mockExecSync.mockReturnValue('git version 2.40.0');
            analyzer = new GitGraphAnalyzer();
            expect(analyzer.isGitAvailable()).toBe(true);
        });

        it('should detect git CLI unavailability', () => {
            mockExecSync.mockImplementation((cmd: string) => {
                if (cmd === 'git --version') {
                    throw new Error('Command not found');
                }
                return '';
            });

            analyzer = new GitGraphAnalyzer();
            expect(analyzer.isGitAvailable()).toBe(false);
        });
    });

    describe('getAncestry', () => {
        beforeEach(() => {
            mockExecSync.mockReturnValue('git version 2.40.0');
            process.env.GITHUB_WORKSPACE = '/github/workspace';
            analyzer = new GitGraphAnalyzer();
        });

        it('should parse git log output correctly', () => {
            mockExecSync.mockImplementation((cmd: string) => {
                if (cmd === 'git --version') return 'git version 2.40.0';
                return 'abc123 Commit message 1\ndef456 Commit message 2\nghi789 Commit message 3';
            });
            analyzer = new GitGraphAnalyzer();

            const ancestry = analyzer.getAncestry('main');

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
            mockExecSync.mockImplementation((cmd: string) => {
                if (cmd === 'git --version') return 'git version 2.40.0';
                return '';
            });
            analyzer = new GitGraphAnalyzer();

            const ancestry = analyzer.getAncestry('main');
            expect(ancestry).toEqual([]);
        });

        it('should handle git command failure', () => {
            mockExecSync.mockImplementation((cmd: string) => {
                if (cmd === 'git --version') return 'git version 2.40.0';
                throw new Error('Git command failed');
            });
            analyzer = new GitGraphAnalyzer();

            const ancestry = analyzer.getAncestry('main');
            expect(ancestry).toEqual([]);
            expect(mockWarning).toHaveBeenCalledWith(expect.stringContaining('Failed to get ancestry for ref main'));
        });

        it('should return empty array when git CLI not available', () => {
            mockExecSync.mockImplementation((cmd: string) => {
                if (cmd === 'git --version') {
                    throw new Error('Command not found');
                }
                return '';
            });
            analyzer = new GitGraphAnalyzer();

            const ancestry = analyzer.getAncestry('main');
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
            process.env.GITHUB_WORKSPACE = '/github/workspace';
        });

        it('should find previous benchmark using git ancestry', () => {
            const suites = [
                createMockBenchmark('abc123', '2025-01-01T00:00:00Z'),
                createMockBenchmark('def456', '2025-01-02T00:00:00Z'),
                createMockBenchmark('ghi789', '2025-01-03T00:00:00Z'),
            ];

            mockExecSync.mockImplementation((cmd: string) => {
                if (cmd === 'git --version') return 'git version 2.40.0';
                return 'ghi789 Commit 3\ndef456 Commit 2\nabc123 Commit 1';
            });
            analyzer = new GitGraphAnalyzer();

            const result = analyzer.findPreviousBenchmark(suites, 'ghi789');

            expect(result?.commit.id).toBe('def456');
            expect(result?.commit.timestamp).toBe('2025-01-02T00:00:00Z');
            expect(mockDebug).toHaveBeenCalledWith('Found previous benchmark: def456 based on git ancestry');
        });

        it('should return null when no previous benchmark found', () => {
            const suites = [createMockBenchmark('abc123', '2025-01-01T00:00:00Z')];

            mockExecSync.mockImplementation((cmd: string) => {
                if (cmd === 'git --version') return 'git version 2.40.0';
                return 'abc123 Commit 1';
            });
            analyzer = new GitGraphAnalyzer();

            const result = analyzer.findPreviousBenchmark(suites, 'abc123');

            expect(result).toBeNull();
            expect(mockDebug).toHaveBeenCalledWith('No previous benchmark found in git ancestry');
        });

        it('should fallback to execution time when git command fails', () => {
            const suites = [
                createMockBenchmark('abc123', '2025-01-01T00:00:00Z'),
                createMockBenchmark('def456', '2025-01-02T00:00:00Z'),
            ];

            mockExecSync.mockImplementation((cmd: string) => {
                if (cmd === 'git --version') return 'git version 2.40.0';
                throw new Error('Git failed');
            });
            analyzer = new GitGraphAnalyzer();

            const result = analyzer.findPreviousBenchmark(suites, 'def456');

            // Should fallback to execution time logic (previous in array)
            expect(result?.commit.id).toBe('abc123');
            expect(result?.commit.timestamp).toBe('2025-01-01T00:00:00Z');
        });

        it('should fallback to execution time when current commit not in ancestry', () => {
            const suites = [
                createMockBenchmark('abc123', '2025-01-01T00:00:00Z'),
                createMockBenchmark('def456', '2025-01-02T00:00:00Z'),
            ];

            mockExecSync.mockImplementation((cmd: string) => {
                if (cmd === 'git --version') return 'git version 2.40.0';
                return 'xyz999 Other commit';
            });
            analyzer = new GitGraphAnalyzer();

            const result = analyzer.findPreviousBenchmark(suites, 'def456');

            // Should fallback to execution time logic
            expect(result?.commit.id).toBe('abc123');
            expect(result?.commit.timestamp).toBe('2025-01-01T00:00:00Z');
        });
    });

    describe('findInsertionIndex', () => {
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
            process.env.GITHUB_WORKSPACE = '/github/workspace';
        });

        it('should find correct insertion index after ancestor', () => {
            const suites = [
                createMockBenchmark('abc123', '2025-01-01T00:00:00Z'),
                createMockBenchmark('def456', '2025-01-02T00:00:00Z'),
            ];

            // New commit ghi789 has def456 as ancestor
            mockExecSync.mockImplementation((cmd: string) => {
                if (cmd === 'git --version') return 'git version 2.40.0';
                return 'ghi789 Commit 3\ndef456 Commit 2\nabc123 Commit 1';
            });
            analyzer = new GitGraphAnalyzer();

            const index = analyzer.findInsertionIndex(suites, 'ghi789');

            // Should insert after def456 (index 1), so at index 2
            expect(index).toBe(2);
            expect(mockDebug).toHaveBeenCalledWith('Found ancestor def456 at index 1, inserting after it');
        });

        it('should append to end when no ancestor found', () => {
            const suites = [
                createMockBenchmark('abc123', '2025-01-01T00:00:00Z'),
                createMockBenchmark('def456', '2025-01-02T00:00:00Z'),
            ];

            // New commit has no relation to existing commits
            mockExecSync.mockImplementation((cmd: string) => {
                if (cmd === 'git --version') return 'git version 2.40.0';
                return 'xyz999 Unrelated commit';
            });
            analyzer = new GitGraphAnalyzer();

            const index = analyzer.findInsertionIndex(suites, 'xyz999');

            expect(index).toBe(2);
            expect(mockDebug).toHaveBeenCalledWith('No ancestor found in existing suites, appending to end');
        });

        it('should append to end for empty suites', () => {
            mockExecSync.mockReturnValue('git version 2.40.0');
            analyzer = new GitGraphAnalyzer();

            const index = analyzer.findInsertionIndex([], 'abc123');

            expect(index).toBe(0);
        });
    });
});
