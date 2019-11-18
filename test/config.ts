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

    const validation_tests = [
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
        expected: RegExp;
    }>;

    for (const test of validation_tests) {
        it('validates ' + test.what, async function() {
            mockInputs(test.inputs);
            await A.rejects(configFromJobInput, test.expected);
        });
    }

    const defaultInputs = {
        name: 'Benchmark',
        tool: 'cargo',
        'output-file-path': 'out.txt',
        'gh-pages-branch': 'gh-pages',
        'benchmark-data-dir-path': '.',
        'github-token': '',
        'auto-push': 'false',
        'skip-fetch-gh-pages': 'false',
    };

    const defaultExpected = {
        name: 'Benchmark',
        tool: 'cargo',
        ghPagesBranch: 'gh-pages',
        autoPush: false,
        skipFetchGhPages: false,
        githubToken: undefined,
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
