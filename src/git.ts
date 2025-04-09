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

export function getServerUrlObj(repositoryUrl: string | undefined): URL {
    const urlValue =
        repositoryUrl && repositoryUrl.trim().length > 0
            ? repositoryUrl
            : process.env['GITHUB_SERVER_URL'] ?? DEFAULT_GITHUB_URL;
    return new URL(urlValue);
}

export function getServerUrl(repositoryUrl: string | undefined): string {
    return getServerUrlObj(repositoryUrl).origin;
}

export function getServerName(repositoryUrl: string | undefined): string {
    return getServerUrlObj(repositoryUrl).hostname;
}

export async function cmd(additionalGitOptions: string[], ...args: string[]): Promise<string> {
    core.debug(`Executing Git: ${args.join(' ')}`);
    const serverUrl = getServerUrl(github.context.payload.repository?.html_url);
    const userArgs = [
        ...additionalGitOptions,
        '-c',
        'user.name=henrikingo',
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

export async function branchName(): Promise<string | undefined> {
    try {
        const cmd = `git branch --show-current`;

        const res: ExecResult = await capture(cmd, []);
        return res.stdout.trim();
    } catch {
        return undefined;
    }
}
