import { strict as A } from 'assert';
import * as path from 'path';
import * as os from 'os';
import { configFromJobInput, VALID_TOOLS } from '../src/config';

type Inputs = { [name: string]: string };

const inputs: Inputs = {};
function mockInputs(newInputs: Inputs) {
    for (const name of Object.getOwnPropertyNames(inputs)) {
        delete inputs[name];
    }
    Object.assign(inputs, newInputs);
}

jest.mock('@actions/core', () => ({
    getInput: (name: string) => inputs[name],
}));

describe('configFromJobInput()', function () {
    const cwd = process.cwd();

    beforeAll(function () {
        process.chdir(path.join(__dirname, 'data', 'config'));
    });

    afterAll(function () {
        jest.unmock('@actions/core');
        process.chdir(cwd);
    });

    const defaultInputs = {
        name: 'Benchmark',
        tool: 'cargo',
        'output-file-path': 'out.txt',
	'json-out-path': 'test.txt', // TODO
	platform: 'any',
    };

    const validationTests: Array<{
        what: string;
        inputs: Inputs;
        expected: RegExp;
    }> = [
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
    ];

    it.each(validationTests)('validates $what', async function (test) {
        mockInputs(test.inputs);
        await A.rejects(configFromJobInput, test.expected);
    });

    interface ExpectedResult {
        name: string;
        tool: string;
	platform: string;
    }

    const defaultExpected: ExpectedResult = {
        name: 'Benchmark',
        tool: 'cargo',
	platform: 'platform',
    };

    const returnedConfigTests: Array<{
        what: string;
        inputs: any;
        expected: ExpectedResult;
    }> = [
        ...VALID_TOOLS.map((tool: string) => ({
            what: 'valid tool ' + tool,
            inputs: { ...defaultInputs, tool },
            expected: { ...defaultExpected, tool },
        })),
        {
            what: 'with specified name',
            inputs: { ...defaultInputs, name: 'My Name is...' },
            expected: { ...defaultExpected, name: 'My Name is...' },
        },
    ];

    it.each(returnedConfigTests)('returns validated config with $what', async function (test) {
        mockInputs(test.inputs);
        const actual = await configFromJobInput();
        A.equal(actual.name, test.expected.name);
        A.equal(actual.tool, test.expected.tool);
    });

    it('resolves relative paths in config', async function () {
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
    });

    it('does not change absolute paths in config', async function () {
        const outFile = path.resolve('out.txt');
        mockInputs({
            ...defaultInputs,
            'output-file-path': outFile,
        });

        const config = await configFromJobInput();
        A.equal(config.outputFilePath, outFile);
    });

    it('resolves home directory in output directory path', async function () {
        const home = os.homedir();
        const absCwd = process.cwd();
        if (!absCwd.startsWith(home)) {
            // Test was not run under home directory so "~" in paths cannot be tested
            fail('Test was not run under home directory so "~" in paths cannot be tested');
        }

        const cwd = path.join('~', absCwd.slice(home.length));
        const file = path.join(cwd, 'out.txt');

        mockInputs({
            ...defaultInputs,
            'output-file-path': file,
        });

        const config = await configFromJobInput();
        A.ok(path.isAbsolute(config.outputFilePath), config.outputFilePath);
        A.equal(config.outputFilePath, path.join(absCwd, 'out.txt'));
    });
});
