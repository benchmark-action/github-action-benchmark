import { strict as A } from 'assert';
import { deepStrictEqual as eq, notDeepStrictEqual as neq } from 'assert';
import mock = require('mock-require');

interface ExecOptions {
    listeners: {
        stdout(b: Buffer): void;
        stderr(b: Buffer): void;
    };
}

let execReturnValue = 0;
let lastArgs: [string, string[], ExecOptions] | null = null;
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
        lastArgs = [c, a, o];
        o.listeners.stdout(Buffer.from('this is test'));
        return Promise.resolve(execReturnValue);
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

const git = require('../src/git');
const ok: (x: any) => asserts x = A.ok;
const userArgs = ['-c', 'user.name=github-action-benchmark', '-c', 'user.email=github@users.noreply.github.com'];

describe('git', function() {
    after(function() {
        mock.stop('@actions/exec');
        mock.stop('@actions/core');
        mock.stop('@actions/github');
    });

    afterEach(function() {
        lastArgs = null;
        execReturnValue = 0;
    });

    describe('cmd()', function() {
        it('runs Git command successfully', async function() {
            const stdout = await git.cmd('log', '--oneline');

            eq(stdout, 'this is test');
            ok(lastArgs);
            eq(lastArgs[0], 'git');
            eq(lastArgs[1], userArgs.concat(['log', '--oneline']));
            ok('listeners' in (lastArgs[2] as object));
        });

        it('raises an error when command returns non-zero exit code', async function() {
            execReturnValue = 101;
            await A.rejects(() => git.cmd('show'), /^Error: Command 'git show' failed: /);
            neq(lastArgs, null);
        });
    });

    describe('push()', function() {
        afterEach(function() {
            gitHubContext.payload.repository = { full_name: 'user/repo' };
        });

        it('runs `git push` with given branch and options', async function() {
            const stdout = await git.push('this-is-token', 'my-branch', 'opt1', 'opt2');

            eq(stdout, 'this is test');
            ok(lastArgs);
            eq(lastArgs[0], 'git');
            eq(
                lastArgs[1],
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
                () => git.push('this-is-token', 'my-branch', 'opt1', 'opt2'),
                /^Error: Repository info is not available in payload/,
            );
            eq(lastArgs, null);
        });
    });

    describe('pull()', function() {
        afterEach(function() {
            gitHubContext.payload.repository = { full_name: 'user/repo' };
        });

        it('runs `git pull` with given branch and options with token', async function() {
            const stdout = await git.pull('this-is-token', 'my-branch', 'opt1', 'opt2');

            eq(stdout, 'this is test');
            ok(lastArgs);
            eq(lastArgs[0], 'git');
            eq(
                lastArgs[1],
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
            const stdout = await git.pull(undefined, 'my-branch', 'opt1', 'opt2');

            eq(stdout, 'this is test');
            ok(lastArgs);
            eq(lastArgs[0], 'git');
            eq(lastArgs[1], userArgs.concat(['pull', 'origin', 'my-branch', 'opt1', 'opt2']));
        });

        it('raises an error when repository info is not included in payload', async function() {
            gitHubContext.payload.repository = null;
            await A.rejects(
                () => git.pull('this-is-token', 'my-branch', 'opt1', 'opt2'),
                /^Error: Repository info is not available in payload/,
            );
            eq(lastArgs, null);
        });
    });
});
