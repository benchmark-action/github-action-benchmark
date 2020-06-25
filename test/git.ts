import { strict as A } from 'assert';
import { deepStrictEqual as eq, notDeepStrictEqual as neq } from 'assert';
import mock = require('mock-require');

interface ExecOptions {
    listeners: {
        stdout(b: Buffer): void;
        stderr(b: Buffer): void;
    };
}

class FakedExec {
    lastArgs: [string, string[], ExecOptions] | null;
    stdout: string;
    stderr: string | null;
    exitCode: number;
    error: string | null;

    constructor() {
        this.lastArgs = null;
        this.stdout = 'this is test';
        this.stderr = null;
        this.exitCode = 0;
        this.error = null;
    }

    reset() {
        this.lastArgs = null;
        this.stdout = 'this is test';
        this.stderr = null;
        this.exitCode = 0;
        this.error = null;
    }
}

const fakedExec = new FakedExec();
const gitHubContext = {
    payload: {
        repository: {
            full_name: 'user/repo',
        },
    },
} as {
    payload: {
        repository: {
            full_name: string;
        } | null;
    };
};

mock('@actions/exec', {
    exec: (c: string, a: string[], o: ExecOptions) => {
        fakedExec.lastArgs = [c, a, o];
        o.listeners.stdout(Buffer.from(fakedExec.stdout));
        if (fakedExec.stderr !== null) {
            o.listeners.stderr(Buffer.from(fakedExec.stderr));
        }
        if (fakedExec.error === null) {
            return Promise.resolve(fakedExec.exitCode);
        } else {
            return Promise.reject(new Error(fakedExec.error));
        }
    },
});
mock('@actions/core', {
    debug: () => {
        /* do nothing */
    },
});
mock('@actions/github', {
    context: gitHubContext,
});

const { cmd, pull, push, fetch } = require('../src/git');
const ok: (x: any) => asserts x = A.ok;
const userArgs = [
    '-c',
    'user.name=github-action-benchmark',
    '-c',
    'user.email=github@users.noreply.github.com',
    '-c',
    'http.https://github.com/.extraheader=',
];

describe('git', function() {
    after(function() {
        mock.stop('@actions/exec');
        mock.stop('@actions/core');
        mock.stop('@actions/github');
    });

    afterEach(function() {
        fakedExec.reset();
    });

    describe('cmd()', function() {
        it('runs Git command successfully', async function() {
            const stdout = await cmd('log', '--oneline');
            const args = fakedExec.lastArgs;

            eq(stdout, 'this is test');
            ok(args);
            eq(args[0], 'git');
            eq(args[1], userArgs.concat(['log', '--oneline']));
            ok('listeners' in (args[2] as object));
        });

        it('raises an error when command returns non-zero exit code', async function() {
            fakedExec.exitCode = 101;
            await A.rejects(() => cmd('show'), /^Error: Command 'git show' failed: /);
            neq(fakedExec.lastArgs, null);
        });

        it('raises an error with stderr output', async function() {
            fakedExec.exitCode = 101;
            fakedExec.stderr = 'this is error output!';
            await A.rejects(() => cmd('show'), /this is error output!/);
        });

        it('raises an error when exec.exec() threw an error', async function() {
            fakedExec.error = 'this is error from exec.exec';
            fakedExec.stderr = 'this is stderr output!';
            await A.rejects(() => cmd('show'), /this is error from exec\.exec/);
            await A.rejects(() => cmd('show'), /this is stderr output!/);
        });
    });

    describe('push()', function() {
        afterEach(function() {
            gitHubContext.payload.repository = { full_name: 'user/repo' };
        });

        it('runs `git push` with given branch and options', async function() {
            const stdout = await push('this-is-token', 'my-branch', 'opt1', 'opt2');
            const args = fakedExec.lastArgs;

            eq(stdout, 'this is test');
            ok(args);
            eq(args[0], 'git');
            eq(
                args[1],
                userArgs.concat([
                    'push',
                    'https://x-access-token:this-is-token@github.com/user/repo.git',
                    'my-branch:my-branch',
                    '--no-verify',
                    'opt1',
                    'opt2',
                ]),
            );
        });

        it('raises an error when repository info is not included in payload', async function() {
            gitHubContext.payload.repository = null;
            await A.rejects(
                () => push('this-is-token', 'my-branch', 'opt1', 'opt2'),
                /^Error: Repository info is not available in payload/,
            );
            eq(fakedExec.lastArgs, null);
        });
    });

    describe('pull()', function() {
        afterEach(function() {
            gitHubContext.payload.repository = { full_name: 'user/repo' };
        });

        it('runs `git pull` with given branch and options with token', async function() {
            const stdout = await pull('this-is-token', 'my-branch', 'opt1', 'opt2');
            const args = fakedExec.lastArgs;

            eq(stdout, 'this is test');
            ok(args);
            eq(args[0], 'git');
            eq(
                args[1],
                userArgs.concat([
                    'pull',
                    'https://x-access-token:this-is-token@github.com/user/repo.git',
                    'my-branch',
                    'opt1',
                    'opt2',
                ]),
            );
        });

        it('runs `git pull` with given branch and options without token', async function() {
            const stdout = await pull(undefined, 'my-branch', 'opt1', 'opt2');
            const args = fakedExec.lastArgs;

            eq(stdout, 'this is test');
            ok(args);
            eq(args[0], 'git');
            eq(args[1], userArgs.concat(['pull', 'origin', 'my-branch', 'opt1', 'opt2']));
        });

        it('raises an error when repository info is not included in payload', async function() {
            gitHubContext.payload.repository = null;
            await A.rejects(
                () => pull('this-is-token', 'my-branch', 'opt1', 'opt2'),
                /^Error: Repository info is not available in payload/,
            );
            eq(fakedExec.lastArgs, null);
        });
    });

    describe('fetch()', function() {
        afterEach(function() {
            gitHubContext.payload.repository = { full_name: 'user/repo' };
        });

        it('runs `git fetch` with given branch and options with token', async function() {
            const stdout = await fetch('this-is-token', 'my-branch', 'opt1', 'opt2');
            const args = fakedExec.lastArgs;

            eq(stdout, 'this is test');
            ok(args);
            eq(args[0], 'git');
            eq(
                args[1],
                userArgs.concat([
                    'fetch',
                    'https://x-access-token:this-is-token@github.com/user/repo.git',
                    'my-branch:my-branch',
                    'opt1',
                    'opt2',
                ]),
            );
        });

        it('runs `git fetch` with given branch and options without token', async function() {
            const stdout = await fetch(undefined, 'my-branch', 'opt1', 'opt2');
            const args = fakedExec.lastArgs;

            eq(stdout, 'this is test');
            ok(args);
            eq(args[0], 'git');
            eq(args[1], userArgs.concat(['fetch', 'origin', 'my-branch:my-branch', 'opt1', 'opt2']));
        });

        it('raises an error when repository info is not included in payload', async function() {
            gitHubContext.payload.repository = null;
            await A.rejects(
                () => fetch('this-is-token', 'my-branch', 'opt1', 'opt2'),
                /^Error: Repository info is not available in payload/,
            );
            eq(fakedExec.lastArgs, null);
        });
    });
});
