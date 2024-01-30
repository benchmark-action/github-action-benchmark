import { Benchmark } from '../extract';
import { biggerIsBetter } from './biggerIsBetter';
import { floatStr, strVal } from './markdownUtils';
import { commentFooter } from './commentFooter';

export function buildComment(
    benchName: string,
    curSuite: Benchmark,
    prevSuite: Benchmark,
    expandableDetails = true,
): string {
    const lines = [
        `# ${benchName}`,
        '',
        expandableDetails ? '<details>' : '',
        '',
        `| Benchmark suite | Current: ${curSuite.commit.id} | Previous: ${prevSuite.commit.id} | Ratio |`,
        '|-|-|-|-|',
    ];

    for (const current of curSuite.benches) {
        let line;
        const prev = prevSuite.benches.find((i) => i.name === current.name);

        if (prev) {
            const ratio = biggerIsBetter(curSuite.tool)
                ? prev.value / current.value // e.g. current=100, prev=200
                : current.value / prev.value;

            line = `| \`${current.name}\` | ${strVal(current)} | ${strVal(prev)} | \`${floatStr(ratio)}\` |`;
        } else {
            line = `| \`${current.name}\` | ${strVal(current)} | | |`;
        }

        lines.push(line);
    }

    // Footer
    lines.push('', expandableDetails ? '</details>' : '', '', commentFooter());

    return lines.join('\n');
}
