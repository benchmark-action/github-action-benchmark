import * as github from '@actions/github';
import { execSync } from 'child_process';
import * as core from '@actions/core';

export interface Benchmark {
  commit: {
    id: string;
    timestamp: string;
    message: string;
    url: string;
  };
  date: number;
  benches: any[];
}

export class GitGraphAnalyzer {
  private gitCliAvailable: boolean;

  constructor() {
    // Check if we're in GitHub Actions environment (git CLI available)
    this.gitCliAvailable = process.env.GITHUB_ACTIONS === 'true' && process.env.GITHUB_WORKSPACE;
  }

  /**
   * Get current branch from GitHub context
   */
  getCurrentBranch(): string {
    const context = github.context;

    // For pull requests, get the head branch
    if (context.payload.pull_request) {
      return context.payload.pull_request.head.ref;
    }

    // For pushes, get the branch from ref
    if (context.ref) {
      // Remove 'refs/heads/' prefix if present
      return context.ref.replace('refs/heads/', '');
    }

    // Fallback to 'main' if we can't determine branch
    return 'main';
  }

  /**
   * Get git ancestry using topological order (only works in GitHub Actions environment)
   */
  getBranchAncestry(branch: string): string[] {
    if (!this.gitCliAvailable) {
      core.warning('Git CLI not available, cannot determine ancestry');
      return [];
    }

    try {
      const output = execSync(`git log --oneline --topo-order ${branch}`, {
        encoding: 'utf8',
        cwd: process.env.GITHUB_WORKSPACE || process.cwd()
      });

      return output
        .split('\n')
        .filter(line => line.trim())
        .map(line => line.split(' ')[0]); // Extract SHA from "sha message"
    } catch (error) {
      core.warning(`Failed to get ancestry for branch ${branch}: ${error}`);
      return [];
    }
  }

  /**
   * Find previous benchmark commit based on git graph structure
   */
  findPreviousBenchmark(
    suites: Benchmark[],
    currentSha: string,
    branch: string
  ): Benchmark | null {
    const ancestry = this.getBranchAncestry(branch);

    if (ancestry.length === 0) {
      console.warn(`No ancestry found for branch ${branch}, falling back to execution time ordering`);
      return this.findPreviousByExecutionTime(suites, currentSha);
    }

    // Find position of current commit in ancestry
    const currentIndex = ancestry.indexOf(currentSha);
    if (currentIndex === -1) {
      console.warn(`Current commit ${currentSha} not found in ancestry, falling back to execution time ordering`);
      return this.findPreviousByExecutionTime(suites, currentSha);
    }

    // Look for next commit in ancestry that exists in benchmarks
    for (let i = currentIndex + 1; i < ancestry.length; i++) {
      const previousSha = ancestry[i];
      const previousBenchmark = suites.find(suite => suite.commit.id === previousSha);

      if (previousBenchmark) {
        console.log(`Found previous benchmark: ${previousSha} based on git ancestry`);
        return previousBenchmark;
      }
    }

    // Fallback: no previous commit found in ancestry
    console.log('No previous benchmark found in git ancestry');
    return null;
  }

  /**
   * Sort benchmark data by commit timestamp (for GitHub Pages visualization)
   * This doesn't need git CLI - just uses the commit timestamps already stored
   */
  sortByGitOrder(suites: Benchmark[]): Benchmark[] {
    if (suites.length === 0) return suites;

    // For GitHub Pages, we don't have git CLI, so sort by commit timestamp
    // This gives a reasonable approximation of git order
    const sortedSuites = [...suites].sort((a, b) => {
      const timestampA = new Date(a.commit.timestamp).getTime();
      const timestampB = new Date(b.commit.timestamp).getTime();
      return timestampA - timestampB;
    });

    core.debug('Sorted benchmarks by commit timestamp (GitHub Pages mode)');
    return sortedSuites;
  }

  /**
   * Advanced sorting using git CLI (only for GitHub Actions)
   */
  sortByGitOrderWithCLI(suites: Benchmark[]): Benchmark[] {
    if (!this.gitCliAvailable) {
      return this.sortByGitOrder(suites);
    }

    if (suites.length === 0) return suites;

    // Create a map of SHA to benchmark for quick lookup
    const benchmarkMap = new Map<string, Benchmark>();
    for (const suite of suites) {
      benchmarkMap.set(suite.commit.id, suite);
    }

    // Get ancestry from all commits (use the branch of the first commit)
    const firstSuite = suites[0];
    const branch = this.detectBranchForCommit(firstSuite.commit.id);
    const ancestry = this.getBranchAncestry(branch);

    if (ancestry.length === 0) {
      core.warning('Could not determine git ancestry, falling back to timestamp sort');
      return this.sortByGitOrder(suites);
    }

    // Sort benchmarks according to git ancestry
    const sortedSuites: Benchmark[] = [];
    for (const sha of ancestry) {
      const benchmark = benchmarkMap.get(sha);
      if (benchmark) {
        sortedSuites.push(benchmark);
      }
    }

    // Add any benchmarks not found in ancestry (shouldn't happen, but be safe)
    for (const suite of suites) {
      if (!sortedSuites.includes(suite)) {
        sortedSuites.push(suite);
      }
    }

    core.debug(`Sorted ${sortedSuites.length} benchmarks using git CLI ancestry`);
    return sortedSuites;
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
   * Attempt to detect which branch a commit belongs to
   */
  private detectBranchForCommit(sha: string): string {
    if (!this.gitCliAvailable) {
      return 'main'; // Default for GitHub Pages
    }

    try {
      // Try to find if commit is on current branch first
      const currentBranch = this.getCurrentBranch();
      const output = execSync(`git branch --contains ${sha}`, {
        encoding: 'utf8',
        cwd: process.env.GITHUB_WORKSPACE || process.cwd()
      });

      if (output.includes(currentBranch)) {
        return currentBranch;
      }

      // Default to main if we can't determine
      return 'main';
    } catch (error) {
      core.warning(`Could not detect branch for commit ${sha}, defaulting to 'main'`);
      return 'main';
    }
  }
}