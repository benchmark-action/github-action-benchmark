import { spawnSync } from 'child_process';
import * as core from '@actions/core';
import { Benchmark } from './extract';

let cachedInstance: GitGraphAnalyzer | null = null;

export class GitGraphAnalyzer {
    private readonly gitCliAvailable: boolean;

    constructor() {
        const result = spawnSync('git', ['--version'], { stdio: 'ignore' });
        if (result.error) {
            this.gitCliAvailable = false;
            core.debug('Git CLI not available during initialization');
        } else {
            this.gitCliAvailable = true;
        }
    }

    /**
     * Check if git CLI is available
     */
    isGitAvailable(): boolean {
        return this.gitCliAvailable;
    }

    /**
     * Validate that a ref matches expected git reference patterns.
     * Accepts SHA hashes, branch names, and tag names.
     */
    private isValidRef(ref: string): boolean {
        if (!ref || ref.length === 0) {
            return false;
        }
        if (ref.startsWith('-')) {
            return false;
        }
        // Allow: hex SHA (short or full), branch/tag names (alphanumeric, dots, underscores, hyphens, slashes)
        const validRefPattern = /^[a-zA-Z0-9._\-/]+$/;
        return validRefPattern.test(ref);
    }

    /**
     * Get git ancestry using topological order
     */
    getAncestry(ref: string): string[] {
        core.debug(`GitGraphAnalyzer.getAncestry called with ref='${ref}'`);
        core.debug(`GitGraphAnalyzer.getAncestry cwd='${process.cwd()}'`);
        core.debug(`GitGraphAnalyzer.getAncestry GITHUB_WORKSPACE='${process.env.GITHUB_WORKSPACE ?? ''}'`);
        if (!this.gitCliAvailable) {
            core.warning('Git CLI not available, cannot determine ancestry');
            return [];
        }

        if (!this.isValidRef(ref)) {
            core.warning(`Invalid git ref format: ${ref}`);
            return [];
        }

        try {
            const args = ['log', '--oneline', '--topo-order', '--', ref];
            const cwd = process.env.GITHUB_WORKSPACE ?? process.cwd();
            core.debug(`GitGraphAnalyzer.getAncestry running: git ${args.join(' ')} (cwd='${cwd}')`);
            const result = spawnSync('git', args, {
                encoding: 'utf8',
                cwd,
            });

            if (result.error) {
                throw result.error;
            }

            if (result.status !== 0) {
                core.warning(
                    `GitGraphAnalyzer.getAncestry git log exited with status ${result.status}. stderr='${result.stderr?.trim() ?? ''}'`,
                );
            }
            if (result.stderr && result.stderr.trim().length > 0) {
                core.debug(`GitGraphAnalyzer.getAncestry stderr: ${result.stderr.trim()}`);
            }
            core.debug(
                `GitGraphAnalyzer.getAncestry stdout length=${result.stdout?.length ?? 0}`,
            );
            if (result.stdout) {
                const preview = result.stdout.split('\n').slice(0, 5).join('\n');
                core.debug(`GitGraphAnalyzer.getAncestry stdout preview:\n${preview}`);
            }

            return result.stdout
                .split('\n')
                .filter((line) => line.trim())
                .map((line) => line.split(' ')[0]); // Extract SHA from "sha message"
        } catch (error) {
            core.warning(`Failed to get ancestry for ref ${ref}: ${error}`);
            return [];
        }
    }

    /**
     * Find previous benchmark commit based on git ancestry.
     * Falls back to execution time ordering if git ancestry is not available.
     */
    findPreviousBenchmark(suites: Benchmark[], currentSha: string): Benchmark | null {
        const ancestry = this.getAncestry(currentSha);

        if (ancestry.length === 0) {
            core.warning(`No ancestry found for commit ${currentSha}, falling back to execution time ordering`);
            return this.findPreviousByExecutionTime(suites, currentSha);
        }

        // Find position of current commit in ancestry
        const currentIndex = ancestry.indexOf(currentSha);
        if (currentIndex === -1) {
            core.warning(`Current commit ${currentSha} not found in ancestry, falling back to execution time ordering`);
            return this.findPreviousByExecutionTime(suites, currentSha);
        }

        // Look for next commit in ancestry that exists in benchmarks
        for (let i = currentIndex + 1; i < ancestry.length; i++) {
            const previousSha = ancestry[i];
            const previousBenchmark = suites.find((suite) => suite.commit.id === previousSha);

            if (previousBenchmark) {
                core.debug(`Found previous benchmark: ${previousSha} based on git ancestry`);
                return previousBenchmark;
            }
        }

        // Fallback: no previous commit found in ancestry
        core.debug('No previous benchmark found in git ancestry');
        return null;
    }

    /**
     * Find the insertion index for a new benchmark entry based on git ancestry.
     * Inserts after the most recent ancestor in the existing suites.
     */
    findInsertionIndex(suites: Benchmark[], newCommitSha: string): number {
        if (!this.gitCliAvailable || suites.length === 0) {
            return suites.length;
        }

        const ancestry = this.getAncestry(newCommitSha);
        if (ancestry.length === 0) {
            core.debug('No ancestry found, appending to end');
            return suites.length;
        }

        // Create a set of ancestor SHAs for quick lookup (excluding the commit itself)
        // Skip first element only if it matches the commit (it should)
        const startIndex = ancestry[0] === newCommitSha ? 1 : 0;
        const ancestorSet = new Set(ancestry.slice(startIndex));

        // Find the most recent ancestor in the existing suites
        // Iterate through suites from end to beginning to find the most recent one
        for (let i = suites.length - 1; i >= 0; i--) {
            const suite = suites[i];
            if (ancestorSet.has(suite.commit.id)) {
                core.debug(`Found ancestor ${suite.commit.id} at index ${i}, inserting after it`);
                return i + 1; // Insert after this ancestor
            }
        }

        // No ancestor found in existing suites - this commit is likely from a different branch
        // or is very old. Append to end as fallback.
        core.debug('No ancestor found in existing suites, appending to end');
        return suites.length;
    }

    /**
     * Fallback method: find previous by execution time (original logic)
     */
    private findPreviousByExecutionTime(suites: Benchmark[], currentSha: string): Benchmark | null {
        for (const suite of [...suites].reverse()) {
            if (suite.commit.id !== currentSha) {
                return suite;
            }
        }
        return null;
    }

    /**
     * Get a cached singleton instance of GitGraphAnalyzer.
     * Avoids repeated `git --version` checks across multiple calls.
     */
    static getInstance(): GitGraphAnalyzer {
        if (!cachedInstance) {
            cachedInstance = new GitGraphAnalyzer();
        }
        return cachedInstance;
    }

    /**
     * Reset the cached instance (useful for testing).
     */
    static resetInstance(): void {
        cachedInstance = null;
    }
}
