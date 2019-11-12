import { exec } from '@actions/exec';
import * as core from '@actions/core';

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
        const info = JSON.stringify(res);
        core.debug(`Command '${args}' failed with args ${args.join(' ')}: ${info}`);
        throw err;
    }
}

export default async function git(...args: string[]): Promise<string> {
    core.debug(`Executing Git: ${args.join(' ')}`);
    const res = await capture('git', args);
    if (res.code !== 0) {
        throw new Error(`Command 'git ${args.join(' ')}' failed: ${res}`);
    }
    return res.stdout;
}
