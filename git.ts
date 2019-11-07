import * as actionsExec from '@actions/exec';
import * as core from '@actions/core';

interface ExecResult {
    stdout: string;
    stderr: string;
    code: number | null;
}

async function exec(cmd: string, args: string[]): Promise<ExecResult> {
    const res: ExecResult = {
        stdout: '',
        stderr: '',
        code: null,
    };

    try {
        const code = await actionsExec.exec(cmd, args, {
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
        core.debug(JSON.stringify(res));
        throw err;
    }
}

export default async function git(...args: string[]): Promise<string> {
    const res = await exec('git', args);
    if (res.code !== 0) {
        throw new Error(`Command 'git ${args.join(' ')}' failed: ${res}`);
    }
    return res.stdout;
}
