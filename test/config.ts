import { strict as A } from 'assert';
import * as path from 'path';
import mock = require('mock-require');

type Inputs = { [name: string]: string };

const inputs: Inputs = {};
function mockInputs(newInputs: Inputs) {
    delete inputs.name;
    delete inputs.tool;
    delete inputs['output-file-path'];
    delete inputs['gh-pages-branch'];
    delete inputs['benchmark-data-dir-path'];
    delete inputs['github-token'];
    delete inputs['auto-push'];
    delete inputs['skip-fetch-gh-pages'];
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

    const tests = [
        ...VALID_TOOLS.map((tool: string) => ({
            what: 'valid inputs for ' + tool,
            inputs: {
                name: 'Benchmark',
                tool,
                'output-file-path': 'out.txt',
                'gh-pages-branch': 'gh-pages',
                'benchmark-data-dir-path': '.',
            },
            expected: null,
        })),
        ...['true', 'false'].map(autoPush => ({
            what: `set auto-push to ${autoPush} with token`,
            inputs: {
                name: 'Benchmark',
                tool: 'go',
                'output-file-path': 'out.txt',
                'gh-pages-branch': 'gh-pages',
                'benchmark-data-dir-path': '.',
                'github-token': 'dummy',
                'auto-push': autoPush,
            },
            expected: null,
        })),
        {
            what: 'wrong name',
            inputs: {
                name: '',
                tool: 'cargo',
                'output-file-path': 'out.txt',
                'gh-pages-branch': 'gh-pages',
                'benchmark-data-dir-path': '.',
            },
            expected: /^Error: Name must not be empty$/,
        },
        {
            what: 'wrong tool',
            inputs: {
                name: 'Benchmark',
                tool: 'foo',
                'output-file-path': 'out.txt',
                'gh-pages-branch': 'gh-pages',
                'benchmark-data-dir-path': '.',
            },
            expected: /^Error: Invalid value 'foo' for 'tool' input/,
        },
        {
            what: 'output file does not exist',
            inputs: {
                name: 'Benchmark',
                tool: 'cargo',
                'output-file-path': 'foo.txt',
                'gh-pages-branch': 'gh-pages',
                'benchmark-data-dir-path': '.',
            },
            expected: /^Error: Invalid value for 'output-file-path'/,
        },
        {
            what: 'output file is actually directory',
            inputs: {
                name: 'Benchmark',
                tool: 'cargo',
                'output-file-path': '.',
                'gh-pages-branch': 'gh-pages',
                'benchmark-data-dir-path': '.',
            },
            expected: /Specified path '.*' is not a file/,
        },
        {
            what: 'wrong GitHub pages branch name',
            inputs: {
                name: 'Benchmark',
                tool: 'cargo',
                'output-file-path': 'out.txt',
                'gh-pages-branch': '',
                'benchmark-data-dir-path': '.',
            },
            expected: /^Error: Branch value must not be empty/,
        },
        // Cannot check 'benchmark-data-dir-path' invalidation because it throws an error only when
        // current working directory is not obtainable.
        {
            what: 'resolve home directory in output directory path',
            inputs: {
                name: 'Benchmark',
                tool: 'cargo',
                'output-file-path': 'out.txt',
                'gh-pages-branch': 'gh-pages',
                'benchmark-data-dir-path': '~/path/to/output',
            },
            expected: null,
        },
        {
            what: 'auto-push is set but github-token is not set',
            inputs: {
                name: 'Benchmark',
                tool: 'cargo',
                'output-file-path': 'out.txt',
                'gh-pages-branch': 'gh-pages',
                'benchmark-data-dir-path': 'path/to/output',
                'github-token': undefined,
                'auto-push': 'true',
            },
            expected: /'auto-push' is enabled but 'github-token' is not set/,
        },
        {
            what: 'auto-push is set to other than boolean',
            inputs: {
                name: 'Benchmark',
                tool: 'cargo',
                'output-file-path': 'out.txt',
                'gh-pages-branch': 'gh-pages',
                'benchmark-data-dir-path': 'path/to/output',
                'github-token': 'dummy',
                'auto-push': 'hello',
            },
            expected: /'auto-push' input must be boolean value 'true' or 'false' but got 'hello'/,
        },
    ] as Array<{
        what: string;
        inputs: Inputs;
        expected: RegExp | null;
    }>;

    for (const test of tests) {
        it('validates ' + test.what, async function() {
            mockInputs(test.inputs);
            if (test.expected === null) {
                await A.doesNotReject(configFromJobInput);
            } else {
                await A.rejects(configFromJobInput, test.expected);
            }
        });
    }

    it('resolves paths in config', async function() {
        mockInputs({
            name: 'Benchmark',
            tool: 'cargo',
            'output-file-path': 'out.txt',
            'gh-pages-branch': 'gh-pages',
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
});
