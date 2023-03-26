import { exec } from '@actions/exec';
import * as core from '@actions/core';
import * as github from '@actions/github';
import { URL } from 'url';

const DEFAULT_GITHUB_URL = 'https://github.com';

interface ExecResult {
    stdout: string;
    stderr: string;
    code: number | null;
}

async function capture(cmd: string, args: string[]): Promise<ExecResult> {
    const res: ExecResult = {
        stdout: '',
        stderr: '',
        code: null,
    };

    try {
        const code = await exec(cmd, args, {
            listeners: {
                stdout(data) {
                    res.stdout += data.toString();
                },
                stderr(data) {
                    res.stderr += data.toString();
                },
            },
        });
        res.code = code;
        return res;
    } catch (err) {
        const msg = `Command '${cmd}' failed with args '${args.join(' ')}': ${res.stderr}: ${err}`;
        core.debug(`@actions/exec.exec() threw an error: ${msg}`);
        throw new Error(msg);
    }
}

export function getServerUrl(repositoryUrl: string | undefined): string {
    const urlObj = repositoryUrl ? new URL(repositoryUrl) : new URL(DEFAULT_GITHUB_URL);
    return repositoryUrl ? urlObj.origin : DEFAULT_GITHUB_URL;
}

export function getServerName(repositoryUrl: string | undefined): string {
    const urlObj = repositoryUrl ? new URL(repositoryUrl) : new URL(DEFAULT_GITHUB_URL);
    return repositoryUrl ? urlObj.hostname : DEFAULT_GITHUB_URL.replace('https://', '');
}

export async function cmd(additionalGitOptions: string[], ...args: string[]): Promise<string> {
    core.debug(`Executing Git: ${args.join(' ')}`);
    const serverUrl = getServerUrl(github.context.payload.repository?.html_url);
    const userArgs = [
        ...additionalGitOptions,
        '-c',
        'user.name=github-action-benchmark',
        '-c',
        'user.email=github@users.noreply.github.com',
        '-c',
        `http.${serverUrl}/.extraheader=`, // This config is necessary to support actions/checkout@v2 (#9)
    ];
    const res = await capture('git', userArgs.concat(args));
    if (res.code !== 0) {
        throw new Error(`Command 'git ${args.join(' ')}' failed: ${JSON.stringify(res)}`);
    }
    return res.stdout;
}

function getCurrentRepoRemoteUrl(token: string): string {
    const { repo, owner } = github.context.repo;
    const serverName = getServerName(github.context.payload.repository?.html_url);
    return getRepoRemoteUrl(token, `${serverName}/${owner}/${repo}`);
}

export async function readCommitId(...options: string[]): Promise<string> {
    core.debug(`Executing 'git rev-parse HEAD' with options '${options.join(' ')}'`);

    let args = ['rev-parse', 'HEAD'];
    if (options.length > 0) {
        args = args.concat(options);
    }

    return cmd(options, ...args);
}

export async function readCommitTimestamp(...options: string[]): Promise<string> {
    core.debug(`Executing 'git show -s --format=%ci HEAD' with options '${options.join(' ')}'`);

    let args = ['show', '-s', '--format=%ci', 'HEAD'];
    if (options.length > 0) {
        args = args.concat(options);
    }

    return cmd(options, ...args);
}

export async function readCommitEmail(...options: string[]): Promise<string> {
    core.debug(`Executing 'git show -s --format='%ae' HEAD' with options '${options.join(' ')}'`);

    let args = ['show', '-s', '--format=%ae', 'HEAD'];
    if (options.length > 0) {
        args = args.concat(options);
    }

    return cmd(options, ...args);
}

export async function readCommitMessage(...options: string[]): Promise<string> {
    core.debug(`Executing 'git show -s --format='%s' HEAD' with options '${options.join(' ')}'`);

    let args = ['show', '-s', '--format=%s', 'HEAD'];
    if (options.length > 0) {
        args = args.concat(options);
    }

    return cmd(options, ...args);
}

function getRepoRemoteUrl(token: string, repoUrl: string): string {
    return `https://x-access-token:${token}@${repoUrl}.git`;
}

export async function push(
    token: string,
    repoUrl: string | undefined,
    branch: string,
    additionalGitOptions: string[] = [],
    ...options: string[]
): Promise<string> {
    core.debug(`Executing 'git push' to branch '${branch}' with token and options '${options.join(' ')}'`);

    const remote = repoUrl ? getRepoRemoteUrl(token, repoUrl) : getCurrentRepoRemoteUrl(token);
    let args = ['push', remote, `${branch}:${branch}`, '--no-verify'];
    if (options.length > 0) {
        args = args.concat(options);
    }

    return cmd(additionalGitOptions, ...args);
}

export async function pull(
    token: string | undefined,
    branch: string,
    additionalGitOptions: string[] = [],
    ...options: string[]
): Promise<string> {
    core.debug(`Executing 'git pull' to branch '${branch}' with token and options '${options.join(' ')}'`);

    const remote = token !== undefined ? getCurrentRepoRemoteUrl(token) : 'origin';
    let args = ['pull', remote, branch];
    if (options.length > 0) {
        args = args.concat(options);
    }

    return cmd(additionalGitOptions, ...args);
}

export async function fetch(
    token: string | undefined,
    branch: string,
    additionalGitOptions: string[] = [],
    ...options: string[]
): Promise<string> {
    core.debug(`Executing 'git fetch' for branch '${branch}' with token and options '${options.join(' ')}'`);

    const remote = token !== undefined ? getCurrentRepoRemoteUrl(token) : 'origin';
    let args = ['fetch', remote, `${branch}:${branch}`];
    if (options.length > 0) {
        args = args.concat(options);
    }

    return cmd(additionalGitOptions, ...args);
}

export async function clone(
    token: string,
    ghRepository: string,
    baseDirectory: string,
    additionalGitOptions: string[] = [],
    ...options: string[]
): Promise<string> {
    core.debug(`Executing 'git clone' to directory '${baseDirectory}' with token and options '${options.join(' ')}'`);

    const remote = getRepoRemoteUrl(token, ghRepository);
    let args = ['clone', remote, baseDirectory];
    if (options.length > 0) {
        args = args.concat(options);
    }

    return cmd(additionalGitOptions, ...args);
}
export async function checkout(
    ghRef: string,
    additionalGitOptions: string[] = [],
    ...options: string[]
): Promise<string> {
    core.debug(`Executing 'git checkout' to ref '${ghRef}' with token and options '${options.join(' ')}'`);

    let args = ['checkout', ghRef];
    if (options.length > 0) {
        args = args.concat(options);
    }

    return cmd(additionalGitOptions, ...args);
}
