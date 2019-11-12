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

const git = require('../git').default;
const ok: (x: any) => asserts x = A.ok;

describe('git()', function() {
    after(function() {
        mock.stop('@actions/exec');
        mock.stop('@actions/core');
    });

    afterEach(function() {
        lastArgs = null;
        execReturnValue = 0;
    });

    it('runs Git command successfully', async function() {
        const stdout = await git('log', '--oneline');

        eq(stdout, 'this is test');
        ok(lastArgs);
        eq(lastArgs[0], 'git');
        eq(lastArgs[1], ['log', '--oneline']);
        ok('listeners' in (lastArgs[2] as object));
    });

    it('raises an error when command returns non-zero exit code', async function() {
        execReturnValue = 101;
        await A.rejects(() => git('show'), /^Error: Command 'git show' failed: /);
        neq(lastArgs, null);
    });
});
