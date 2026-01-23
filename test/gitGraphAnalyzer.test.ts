// Mock modules before imports
const mockDebug = jest.fn();
const mockWarning = jest.fn();
const mockSpawnSync = jest.fn();

jest.mock('@actions/core', () => ({
    debug: mockDebug,
    warning: mockWarning,
}));

jest.mock('child_process', () => ({
    spawnSync: mockSpawnSync,
}));

import { GitGraphAnalyzer } from '../src/gitGraph';
import { Benchmark } from '../src/extract';

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
            mockSpawnSync.mockReturnValue({ stdout: 'git version 2.40.0', error: null });
            analyzer = new GitGraphAnalyzer();
            expect(analyzer.isGitAvailable()).toBe(true);
        });

        it('should detect git CLI unavailability', () => {
            mockSpawnSync.mockImplementation((cmd: string) => {
                if (cmd === 'git') {
                    throw new Error('Command not found');
                }
                return { stdout: '', error: null };
            });

            analyzer = new GitGraphAnalyzer();
            expect(analyzer.isGitAvailable()).toBe(false);
        });
    });

    describe('getAncestry', () => {
        beforeEach(() => {
            mockSpawnSync.mockReturnValue({ stdout: 'git version 2.40.0', error: null });
            process.env.GITHUB_WORKSPACE = '/github/workspace';
            analyzer = new GitGraphAnalyzer();
        });

        it('should parse git log output correctly', () => {
            mockSpawnSync.mockImplementation((_cmd: string, args: string[]) => {
                if (args && args[0] === '--version') return { stdout: 'git version 2.40.0', error: null };
                return {
                    stdout: 'abc123 Commit message 1\ndef456 Commit message 2\nghi789 Commit message 3',
                    error: null,
                };
            });
            analyzer = new GitGraphAnalyzer();

            const ancestry = analyzer.getAncestry('main');

            expect(mockSpawnSync).toHaveBeenCalledWith(
                'git',
                ['log', '--oneline', '--topo-order', 'main'],
                expect.objectContaining({
                    encoding: 'utf8',
                    cwd: '/github/workspace',
                }),
            );
            expect(ancestry).toEqual(['abc123', 'def456', 'ghi789']);
        });

        it('should handle empty git log output', () => {
            mockSpawnSync.mockImplementation((_cmd: string, args: string[]) => {
                if (args && args[0] === '--version') return { stdout: 'git version 2.40.0', error: null };
                return { stdout: '', error: null };
            });
            analyzer = new GitGraphAnalyzer();

            const ancestry = analyzer.getAncestry('main');
            expect(ancestry).toEqual([]);
        });

        it('should handle git command failure', () => {
            mockSpawnSync.mockImplementation((_cmd: string, args: string[]) => {
                if (args && args[0] === '--version') return { stdout: 'git version 2.40.0', error: null };
                return { stdout: '', error: new Error('Git command failed') };
            });
            analyzer = new GitGraphAnalyzer();

            const ancestry = analyzer.getAncestry('main');
            expect(ancestry).toEqual([]);
            expect(mockWarning).toHaveBeenCalledWith(expect.stringContaining('Failed to get ancestry for ref main'));
        });

        it('should return empty array when git CLI not available', () => {
            mockSpawnSync.mockImplementation((cmd: string) => {
                if (cmd === 'git') {
                    throw new Error('Command not found');
                }
                return { stdout: '', error: null };
            });
            analyzer = new GitGraphAnalyzer();

            const ancestry = analyzer.getAncestry('main');
            expect(ancestry).toEqual([]);
            expect(mockWarning).toHaveBeenCalledWith('Git CLI not available, cannot determine ancestry');
        });

        it('should reject empty ref', () => {
            const ancestry = analyzer.getAncestry('');
            expect(ancestry).toEqual([]);
            expect(mockWarning).toHaveBeenCalledWith('Invalid git ref format: ');
        });

        it('should reject ref with shell metacharacters', () => {
            const ancestry = analyzer.getAncestry('main; rm -rf /');
            expect(ancestry).toEqual([]);
            expect(mockWarning).toHaveBeenCalledWith('Invalid git ref format: main; rm -rf /');
        });

        it('should reject ref with backticks', () => {
            const ancestry = analyzer.getAncestry('`whoami`');
            expect(ancestry).toEqual([]);
            expect(mockWarning).toHaveBeenCalledWith('Invalid git ref format: `whoami`');
        });

        it('should accept valid SHA hash', () => {
            mockSpawnSync.mockImplementation((_cmd: string, args: string[]) => {
                if (args && args[0] === '--version') return { stdout: 'git version 2.40.0', error: null };
                return { stdout: 'abc123def456 Commit message', error: null };
            });
            analyzer = new GitGraphAnalyzer();

            const ancestry = analyzer.getAncestry('abc123def456');
            expect(ancestry).toEqual(['abc123def456']);
            expect(mockWarning).not.toHaveBeenCalled();
        });

        it('should accept valid branch name with slashes', () => {
            mockSpawnSync.mockImplementation((_cmd: string, args: string[]) => {
                if (args && args[0] === '--version') return { stdout: 'git version 2.40.0', error: null };
                return { stdout: 'abc123 Commit message', error: null };
            });
            analyzer = new GitGraphAnalyzer();

            const ancestry = analyzer.getAncestry('feature/my-branch');
            expect(ancestry).toEqual(['abc123']);
            expect(mockWarning).not.toHaveBeenCalled();
        });

        it('should accept valid tag name with dots', () => {
            mockSpawnSync.mockImplementation((_cmd: string, args: string[]) => {
                if (args && args[0] === '--version') return { stdout: 'git version 2.40.0', error: null };
                return { stdout: 'abc123 Commit message', error: null };
            });
            analyzer = new GitGraphAnalyzer();

            const ancestry = analyzer.getAncestry('v1.2.3');
            expect(ancestry).toEqual(['abc123']);
            expect(mockWarning).not.toHaveBeenCalled();
        });
    });

    describe('findPreviousBenchmark', () => {
        beforeEach(() => {
            process.env.GITHUB_WORKSPACE = '/github/workspace';
        });

        it('should find previous benchmark using git ancestry', () => {
            const suites = [
                createMockBenchmark('abc123', '2025-01-01T00:00:00Z'),
                createMockBenchmark('def456', '2025-01-02T00:00:00Z'),
                createMockBenchmark('ghi789', '2025-01-03T00:00:00Z'),
            ];

            mockSpawnSync.mockImplementation((_cmd: string, args: string[]) => {
                if (args && args[0] === '--version') return { stdout: 'git version 2.40.0', error: null };
                return { stdout: 'ghi789 Commit 3\ndef456 Commit 2\nabc123 Commit 1', error: null };
            });
            analyzer = new GitGraphAnalyzer();

            const result = analyzer.findPreviousBenchmark(suites, 'ghi789');

            expect(result?.commit.id).toBe('def456');
            expect(result?.commit.timestamp).toBe('2025-01-02T00:00:00Z');
            expect(mockDebug).toHaveBeenCalledWith('Found previous benchmark: def456 based on git ancestry');
        });

        it('should return null when no previous benchmark found', () => {
            const suites = [createMockBenchmark('abc123', '2025-01-01T00:00:00Z')];

            mockSpawnSync.mockImplementation((_cmd: string, args: string[]) => {
                if (args && args[0] === '--version') return { stdout: 'git version 2.40.0', error: null };
                return { stdout: 'abc123 Commit 1', error: null };
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

            mockSpawnSync.mockImplementation((_cmd: string, args: string[]) => {
                if (args && args[0] === '--version') return { stdout: 'git version 2.40.0', error: null };
                return { stdout: '', error: new Error('Git failed') };
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

            mockSpawnSync.mockImplementation((_cmd: string, args: string[]) => {
                if (args && args[0] === '--version') return { stdout: 'git version 2.40.0', error: null };
                return { stdout: 'xyz999 Other commit', error: null };
            });
            analyzer = new GitGraphAnalyzer();

            const result = analyzer.findPreviousBenchmark(suites, 'def456');

            // Should fallback to execution time logic
            expect(result?.commit.id).toBe('abc123');
            expect(result?.commit.timestamp).toBe('2025-01-01T00:00:00Z');
        });
    });

    describe('findInsertionIndex', () => {
        beforeEach(() => {
            process.env.GITHUB_WORKSPACE = '/github/workspace';
        });

        it('should find correct insertion index after ancestor', () => {
            const suites = [
                createMockBenchmark('abc123', '2025-01-01T00:00:00Z'),
                createMockBenchmark('def456', '2025-01-02T00:00:00Z'),
            ];

            // New commit ghi789 has def456 as ancestor
            mockSpawnSync.mockImplementation((_cmd: string, args: string[]) => {
                if (args && args[0] === '--version') return { stdout: 'git version 2.40.0', error: null };
                return { stdout: 'ghi789 Commit 3\ndef456 Commit 2\nabc123 Commit 1', error: null };
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
            mockSpawnSync.mockImplementation((_cmd: string, args: string[]) => {
                if (args && args[0] === '--version') return { stdout: 'git version 2.40.0', error: null };
                return { stdout: 'xyz999 Unrelated commit', error: null };
            });
            analyzer = new GitGraphAnalyzer();

            const index = analyzer.findInsertionIndex(suites, 'xyz999');

            expect(index).toBe(2);
            expect(mockDebug).toHaveBeenCalledWith('No ancestor found in existing suites, appending to end');
        });

        it('should append to end for empty suites', () => {
            mockSpawnSync.mockReturnValue({ stdout: 'git version 2.40.0', error: null });
            analyzer = new GitGraphAnalyzer();

            const index = analyzer.findInsertionIndex([], 'abc123');

            expect(index).toBe(0);
        });
    });
});
