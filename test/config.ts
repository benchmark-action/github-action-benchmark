import { strict as A } from 'assert';
import * as path from 'path';
import * as os from 'os';
import mock = require('mock-require');

type Inputs = { [name: string]: string };

const inputs: Inputs = {};
function mockInputs(newInputs: Inputs) {
    for (const name of Object.getOwnPropertyNames(inputs)) {
        delete inputs[name];
    }
    Object.assign(inputs, newInputs);
}

mock('@actions/core', {
    getInput: (name: string) => inputs[name],
});

// This line must be called after mocking
const { configFromJobInput, VALID_TOOLS } = require('../config');

describe('configFromJobInput()', function() {
    const cwd = process.cwd();

    before(function() {
        process.chdir(path.join(__dirname, 'data', 'config'));
    });

    after(function() {
        mock.stop('@actions/core');
        process.chdir(cwd);
    });

    const defaultInputs = {
        name: 'Benchmark',
        tool: 'cargo',
        'output-file-path': 'out.txt',
        'gh-pages-branch': 'gh-pages',
        'benchmark-data-dir-path': '.',
        'github-token': '',
        'auto-push': 'false',
        'skip-fetch-gh-pages': 'false',
        'comment-on-alert': 'false',
        'alert-threshold': '200%',
        'fail-on-alert': 'false',
    };

    const validation_tests = [
        {
            what: 'wrong name',
            inputs: { ...defaultInputs, name: '' },
            expected: /^Error: Name must not be empty$/,
        },
        {
            what: 'wrong tool',
            inputs: { ...defaultInputs, tool: 'foo' },
            expected: /^Error: Invalid value 'foo' for 'tool' input/,
        },
        {
            what: 'output file does not exist',
            inputs: { ...defaultInputs, 'output-file-path': 'foo.txt' },
            expected: /^Error: Invalid value for 'output-file-path'/,
        },
        {
            what: 'output file is actually directory',
            inputs: { ...defaultInputs, 'output-file-path': '.' },
            expected: /Specified path '.*' is not a file/,
        },
        {
            what: 'wrong GitHub pages branch name',
            inputs: { ...defaultInputs, 'gh-pages-branch': '' },
            expected: /^Error: Branch value must not be empty/,
        },
        // Cannot check 'benchmark-data-dir-path' invalidation because it throws an error only when
        // current working directory is not obtainable.
        {
            what: 'auto-push is set but github-token is not set',
            inputs: { ...defaultInputs, 'auto-push': 'true', 'github-token': '' },
            expected: /'auto-push' is enabled but 'github-token' is not set/,
        },
        {
            what: 'auto-push is set to other than boolean',
            inputs: { ...defaultInputs, 'auto-push': 'hello', 'github-token': 'dummy' },
            expected: /'auto-push' input must be boolean value 'true' or 'false' but got 'hello'/,
        },
        {
            what: 'alert-threshold does not have percentage value',
            inputs: { ...defaultInputs, 'alert-threshold': '1.2' },
            expected: /'alert-threshold' input must ends with '%' for percentage value/,
        },
        {
            what: 'alert-threshold does not have correct percentage number',
            inputs: { ...defaultInputs, 'alert-threshold': 'foo%' },
            expected: /Specified value 'foo' in 'alert-threshold' input cannot be parsed as float number/,
        },
        {
            what: 'comment-on-alert is set but github-token is not set',
            inputs: { ...defaultInputs, 'comment-on-alert': 'true', 'github-token': '' },
            expected: /'comment-on-alert' is enabled but 'github-token' is not set/,
        },
    ] as Array<{
        what: string;
        inputs: Inputs;
        expected: RegExp;
    }>;

    for (const test of validation_tests) {
        it('validates ' + test.what, async function() {
            mockInputs(test.inputs);
            await A.rejects(configFromJobInput, test.expected);
        });
    }

    const defaultExpected = {
        name: 'Benchmark',
        tool: 'cargo',
        ghPagesBranch: 'gh-pages',
        autoPush: false,
        skipFetchGhPages: false,
        githubToken: undefined,
        commentOnAlert: false,
        alertThreshold: 2,
        failOnAlert: false,
    };
    const returned_config_tests = [
        ...VALID_TOOLS.map((tool: string) => ({
            what: 'valid tool ' + tool,
            inputs: { ...defaultInputs, tool },
            expected: { ...defaultExpected, tool },
        })),
        ...([
            ['auto-push', 'autoPush'],
            ['skip-fetch-gh-pages', 'skipFetchGhPages'],
            ['comment-on-alert', 'commentOnAlert'],
            ['fail-on-alert', 'failOnAlert'],
        ] as const)
            .map(([name, prop]) =>
                ['true', 'false'].map(v => ({
                    what: `boolean input ${name} set to '${v}'`,
                    inputs: { ...defaultInputs, 'github-token': 'dummy', [name]: v },
                    expected: { ...defaultExpected, githubToken: 'dummy', [prop]: v === 'true' },
                })),
            )
            .flat(),
        {
            what: 'with specified name',
            inputs: { ...defaultInputs, name: 'My Name is...' },
            expected: { ...defaultExpected, name: 'My Name is...' },
        },
        {
            what: 'with specified GitHub Pages branch',
            inputs: { ...defaultInputs, 'gh-pages-branch': 'master' },
            expected: { ...defaultExpected, ghPagesBranch: 'master' },
        },
        ...[
            ['150%', 1.5],
            ['0%', 0],
            ['123.4%', 1.234],
        ].map(([v, e]) => ({
            what: `with alert threshold ${v}`,
            inputs: { ...defaultInputs, 'alert-threshold': v },
            expected: { ...defaultExpected, alertThreshold: e },
        })),
    ] as Array<{
        what: string;
        inputs: Inputs;
        expected: {
            name: string;
            tool: string;
            ghPagesBranch: string;
            githubToken: string | undefined;
            autoPush: boolean;
            skipFetchGhPages: boolean;
            commentOnAlert: boolean;
            alertThreshold: number;
            failOnAlert: boolean;
        };
    }>;

    for (const test of returned_config_tests) {
        it('returns validated config with ' + test.what, async function() {
            mockInputs(test.inputs);
            const actual = await configFromJobInput();
            A.equal(actual.name, test.expected.name);
            A.equal(actual.tool, test.expected.tool);
            A.equal(actual.ghPagesBranch, test.expected.ghPagesBranch);
            A.equal(actual.githubToken, test.expected.githubToken);
            A.equal(actual.skipFetchGhPages, test.expected.skipFetchGhPages);
            A.equal(actual.commentOnAlert, test.expected.commentOnAlert);
            A.equal(actual.failOnAlert, test.expected.failOnAlert);
            A.equal(actual.alertThreshold, test.expected.alertThreshold);
            A.ok(path.isAbsolute(actual.outputFilePath), actual.outputFilePath);
            A.ok(path.isAbsolute(actual.benchmarkDataDirPath), actual.benchmarkDataDirPath);
        });
    }

    it('resolves relative paths in config', async function() {
        mockInputs({
            ...defaultInputs,
            'output-file-path': 'out.txt',
            'benchmark-data-dir-path': 'path/to/output',
        });

        const config = await configFromJobInput();
        A.equal(config.name, 'Benchmark');
        A.equal(config.tool, 'cargo');
        A.ok(path.isAbsolute(config.outputFilePath), config.outputFilePath);
        A.ok(config.outputFilePath.endsWith('out.txt'), config.outputFilePath);
        A.ok(path.isAbsolute(config.benchmarkDataDirPath), config.benchmarkDataDirPath);
        A.ok(config.benchmarkDataDirPath.endsWith('output'), config.benchmarkDataDirPath);
    });

    it('does not change abusolute paths in config', async function() {
        const outFile = path.resolve('out.txt');
        const dataDir = path.resolve('path/to/output');
        mockInputs({
            ...defaultInputs,
            'output-file-path': outFile,
            'benchmark-data-dir-path': dataDir,
        });

        const config = await configFromJobInput();
        A.equal(config.outputFilePath, outFile);
        A.equal(config.benchmarkDataDirPath, dataDir);
    });

    it('resolves home direcotry in output directory path', async function() {
        const home = os.homedir();
        const absCwd = process.cwd();
        if (!absCwd.startsWith(home)) {
            // Test was not run under home directory so "~" in paths cannot be tested
            this.skip();
        }

        const cwd = path.join('~', absCwd.slice(home.length));
        const file = path.join(cwd, 'out.txt');
        const dir = path.join(cwd, 'outdir');

        mockInputs({
            ...defaultInputs,
            'output-file-path': file,
            'benchmark-data-dir-path': dir,
        });

        const config = await configFromJobInput();
        A.ok(path.isAbsolute(config.outputFilePath), config.outputFilePath);
        A.equal(config.outputFilePath, path.join(absCwd, 'out.txt'));
        A.ok(path.isAbsolute(config.benchmarkDataDirPath), config.benchmarkDataDirPath);
        A.equal(config.benchmarkDataDirPath, path.join(absCwd, 'outdir'));
    });
});
