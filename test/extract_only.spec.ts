import * as path from 'path';
import { strict as A } from 'assert';
import { Config, ToolType } from '../src/config';
import { extractData, localWriteBenchmark } from '../src/extract';

describe('extractData()', function () {
    const normalCases: Array<{
        tool: ToolType;
        file: string;
    }> = [
        {
            tool: 'cargo',
            file: 'cargo_output.txt',
        },
        {
            tool: 'cargo',
            file: 'cargo_output2.txt',
        },
        {
            tool: 'cargo',
            file: 'cargo_output3.txt',
        },
        {
            tool: 'cargo',
            file: 'cargo_output_units.txt',
        },
        {
            tool: 'cargo',
            file: 'criterion_output.txt',
        },
    ];

    it.each(normalCases)(`extracts benchmark output from $tool - $file`, async function (test) {
        jest.useFakeTimers({
            now: 1712131503296,
        });
        const outputFilePath = path.join(__dirname, 'data', 'extract', test.file);
        const config = {
            tool: test.tool,
            outputFilePath,
        } as Config;
        const bench = await extractData(config);

        expect(bench).toMatchSnapshot();

        jest.useRealTimers();
    });

    it('raises an error on unexpected tool', async function () {
        const config = {
            tool: 'foo' as any,
            outputFilePath: path.join(__dirname, 'data', 'extract', 'go_output.txt'),
        } as Config;
        await A.rejects(extractData(config), /^Error: FATAL: Unexpected tool: 'foo'$/);
    });

    it('raises an error when output file is not readable', async function () {
        const config = {
            tool: 'cargo',
            outputFilePath: 'path/does/not/exist.txt',
        } as Config;
        await A.rejects(extractData(config));
    });

    it('raises an error when no output found', async function () {
        const config = {
            tool: 'cargo',
            outputFilePath: path.join(__dirname, 'data', 'extract', 'go_output.txt'),
        } as Config;
        await A.rejects(extractData(config), /^Error: No benchmark result was found in /);
    });
});

describe('localWriteBenchmark()', function () {
    const normalCases: Array<{
        tool: ToolType;
        file: string;
    }> = [
        {
            tool: 'cargo',
            file: 'cargo_output.txt',
        },
        {
            tool: 'cargo',
            file: 'cargo_output2.txt',
        },
        {
            tool: 'cargo',
            file: 'cargo_output3.txt',
        },
        {
            tool: 'cargo',
            file: 'cargo_output_units.txt',
        },
        {
            tool: 'cargo',
            file: 'criterion_output.txt',
        },
    ];

    it.each(normalCases)(`extracts benchmark output from $tool - $file`, async function (test) {
        jest.useFakeTimers({
            now: 1712131503296,
        });
        const outputFilePath = path.join(__dirname, 'data', 'extract', test.file);
	const jsonOutPath = "test.txt"; // TODO: tempfile
        const config = {
            tool: test.tool,
            outputFilePath,
	    jsonOutPath,
        } as Config;
        const benches = await extractData(config);

        expect(benches).toMatchSnapshot();

	// write out
	localWriteBenchmark(benches, config);

        jest.useRealTimers();
    });
});
