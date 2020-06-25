import { exec } from '@actions/exec';
import * as core from '@actions/core';
import * as github from '@actions/github';

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

export async function cmd(...args: string[]): Promise<string> {
    core.debug(`Executing Git: ${args.join(' ')}`);
    const userArgs = [
        '-c',
        'user.name=github-action-benchmark',
        '-c',
        'user.email=github@users.noreply.github.com',
        '-c',
        'http.https://github.com/.extraheader=', // This config is necessary to support actions/checkout@v2 (#9)
    ];
    const res = await capture('git', userArgs.concat(args));
    if (res.code !== 0) {
        throw new Error(`Command 'git ${args.join(' ')}' failed: ${JSON.stringify(res)}`);
    }
    return res.stdout;
}

function getRemoteUrl(token: string): string {
    /* eslint-disable @typescript-eslint/camelcase */
    const fullName = github.context.payload.repository?.full_name;
    /* eslint-enable @typescript-eslint/camelcase */

    if (!fullName) {
        throw new Error(`Repository info is not available in payload: ${JSON.stringify(github.context.payload)}`);
    }

    return `https://x-access-token:${token}@github.com/${fullName}.git`;
}

export async function push(token: string, branch: string, ...options: string[]): Promise<string> {
    core.debug(`Executing 'git push' to branch '${branch}' with token and options '${options.join(' ')}'`);

    const remote = getRemoteUrl(token);
    let args = ['push', remote, `${branch}:${branch}`, '--no-verify'];
    if (options.length > 0) {
        args = args.concat(options);
    }

    return cmd(...args);
}

export async function pull(token: string | undefined, branch: string, ...options: string[]): Promise<string> {
    core.debug(`Executing 'git pull' to branch '${branch}' with token and options '${options.join(' ')}'`);

    const remote = token !== undefined ? getRemoteUrl(token) : 'origin';
    let args = ['pull', remote, branch];
    if (options.length > 0) {
        args = args.concat(options);
    }

    return cmd(...args);
}

export async function fetch(token: string | undefined, branch: string, ...options: string[]): Promise<string> {
    core.debug(`Executing 'git fetch' for branch '${branch}' with token and options '${options.join(' ')}'`);

    const remote = token !== undefined ? getRemoteUrl(token) : 'origin';
    let args = ['fetch', remote, `${branch}:${branch}`];
    if (options.length > 0) {
        args = args.concat(options);
    }

    return cmd(...args);
}
