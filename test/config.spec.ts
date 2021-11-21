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
        'gh-pages-branch': 'gh-pages',
        'benchmark-data-dir-path': '.',
        'github-token': '',
        'auto-push': 'false',
        'skip-fetch-gh-pages': 'false',
        'comment-on-alert': 'false',
        'alert-threshold': '200%',
        'fail-on-alert': 'false',
        'alert-comment-cc-users': '',
        'external-data-json-path': '',
        'max-items-in-chart': '',
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
        {
            what: 'user names in alert-comment-cc-users is not starting with @',
            inputs: { ...defaultInputs, 'alert-comment-cc-users': '@foo,bar' },
            expected: /User name in 'alert-comment-cc-users' input must start with '@' but got 'bar'/,
        },
        {
            what: 'external data file is actually directory',
            inputs: { ...defaultInputs, 'external-data-json-path': '.' },
            expected: /must be file but it is actually directory/,
        },
        {
            what: 'both external-data-json-path and auto-push are set at the same time',
            inputs: {
                ...defaultInputs,
                'external-data-json-path': 'external.json',
                'auto-push': 'true',
                'github-token': 'dummy',
            },
            expected: /auto-push must be false when external-data-json-path is set/,
        },
        {
            what: 'invalid integer value for max-items-in-chart',
            inputs: {
                ...defaultInputs,
                'max-items-in-chart': '3.14',
            },
            expected: /'max-items-in-chart' input must be unsigned integer but got '3.14'/,
        },
        {
            what: 'max-items-in-chart must not be zero',
            inputs: {
                ...defaultInputs,
                'max-items-in-chart': '0',
            },
            expected: /'max-items-in-chart' input value must be one or more/,
        },
        {
            what: 'alert-threshold must not be empty',
            inputs: {
                ...defaultInputs,
                'alert-threshold': '',
            },
            expected: /'alert-threshold' input must not be empty/,
        },
        {
            what: 'fail-threshold does not have percentage value',
            inputs: { ...defaultInputs, 'fail-threshold': '1.2' },
            expected: /'fail-threshold' input must ends with '%' for percentage value/,
        },
        {
            what: 'fail-threshold does not have correct percentage number',
            inputs: { ...defaultInputs, 'fail-threshold': 'foo%' },
            expected: /Specified value 'foo' in 'fail-threshold' input cannot be parsed as float number/,
        },
        {
            what: 'fail-threshold is smaller than alert-threshold',
            inputs: { ...defaultInputs, 'alert-threshold': '150%', 'fail-threshold': '120%' },
            expected: /'alert-threshold' value must be smaller than 'fail-threshold' value but got 1.5 > 1.2/,
        },
    ] as Array<{
        what: string;
        inputs: Inputs;
        expected: RegExp;
    }>;

    for (const test of validation_tests) {
        it(`validates ${test.what}`, async function () {
            mockInputs(test.inputs);
            await A.rejects(configFromJobInput, test.expected);
        });
    }

    interface ExpectedResult {
        name: string;
        tool: string;
        ghPagesBranch: string;
        githubToken: string | undefined;
        autoPush: boolean;
        skipFetchGhPages: boolean;
        commentOnAlert: boolean;
        alertThreshold: number;
        failOnAlert: boolean;
        alertCommentCcUsers: string[];
        hasExternalDataJsonPath: boolean;
        maxItemsInChart: null | number;
        failThreshold: number | null;
    }

    const defaultExpected: ExpectedResult = {
        name: 'Benchmark',
        tool: 'cargo',
        ghPagesBranch: 'gh-pages',
        autoPush: false,
        skipFetchGhPages: false,
        githubToken: undefined,
        commentOnAlert: false,
        alertThreshold: 2,
        failOnAlert: false,
        alertCommentCcUsers: [],
        hasExternalDataJsonPath: false,
        maxItemsInChart: null,
        failThreshold: null,
    };

    const returnedConfigTests = [
        ...VALID_TOOLS.map((tool: string) => ({
            what: 'valid tool ' + tool,
            inputs: { ...defaultInputs, tool },
            expected: { ...defaultExpected, tool },
        })),
        ...(
            [
                ['auto-push', 'autoPush'],
                ['skip-fetch-gh-pages', 'skipFetchGhPages'],
                ['comment-on-alert', 'commentOnAlert'],
                ['fail-on-alert', 'failOnAlert'],
            ] as const
        )
            .map(([name, prop]) =>
                ['true', 'false'].map((v) => ({
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
        ...[
            ['@foo', ['@foo']],
            ['@foo,@bar', ['@foo', '@bar']],
            ['@foo, @bar ', ['@foo', '@bar']],
        ].map(([v, e]) => ({
            what: `with comment CC users ${v}`,
            inputs: { ...defaultInputs, 'alert-comment-cc-users': v },
            expected: { ...defaultExpected, alertCommentCcUsers: e },
        })),
        {
            what: 'external JSON file',
            inputs: { ...defaultInputs, 'external-data-json-path': 'external.json' },
            expected: { ...defaultExpected, hasExternalDataJsonPath: true },
        },
        {
            what: 'max items in chart',
            inputs: { ...defaultInputs, 'max-items-in-chart': '50' },
            expected: { ...defaultExpected, maxItemsInChart: 50 },
        },
        {
            what: 'different failure threshold from alert threshold',
            inputs: { ...defaultInputs, 'fail-threshold': '300%' },
            expected: { ...defaultExpected, failThreshold: 3.0 },
        },
        {
            what: 'boolean value parsing an empty input as false',
            inputs: {
                ...defaultInputs,
                'skip-fetch-gh-pages': '',
                'comment-on-alert': '',
                'fail-on-alert': '',
            },
            expected: defaultExpected,
        },
    ] as Array<{
        what: string;
        inputs: Inputs;
        expected: ExpectedResult;
    }>;

    for (const test of returnedConfigTests) {
        it(`returns validated config with ${test.what}`, async function () {
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
            A.deepEqual(actual.alertCommentCcUsers, test.expected.alertCommentCcUsers);
            A.ok(path.isAbsolute(actual.outputFilePath), actual.outputFilePath);
            A.ok(path.isAbsolute(actual.benchmarkDataDirPath), actual.benchmarkDataDirPath);
            A.equal(actual.maxItemsInChart, test.expected.maxItemsInChart);
            if (test.expected.failThreshold === null) {
                A.equal(actual.failThreshold, test.expected.alertThreshold);
            } else {
                A.equal(actual.failThreshold, test.expected.failThreshold);
            }

            if (test.expected.hasExternalDataJsonPath) {
                A.equal(typeof actual.externalDataJsonPath, 'string');
                A.ok(path.isAbsolute(actual.externalDataJsonPath as string), actual.externalDataJsonPath);
            } else {
                A.equal(actual.externalDataJsonPath, undefined);
            }
        });
    }

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
        A.ok(path.isAbsolute(config.benchmarkDataDirPath), config.benchmarkDataDirPath);
        A.ok(config.benchmarkDataDirPath.endsWith('output'), config.benchmarkDataDirPath);
    });

    it('does not change abusolute paths in config', async function () {
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

    it('resolves home directory in output directory path', async function () {
        const home = os.homedir();
        const absCwd = process.cwd();
        if (!absCwd.startsWith(home)) {
            // Test was not run under home directory so "~" in paths cannot be tested
            fail('Test was not run under home directory so "~" in paths cannot be tested');
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
