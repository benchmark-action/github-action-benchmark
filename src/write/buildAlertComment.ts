import { Benchmark } from '../extract';
import { floatStr, strVal } from './markdownUtils';
import { commentFooter } from './commentFooter';
import { Alert } from './alert';

export function buildAlertComment(
    alerts: Alert[],
    benchName: string,
    curSuite: Benchmark,
    prevSuite: Benchmark,
    threshold: number,
    cc: string[],
): string {
    // Do not show benchmark name if it is the default value 'Benchmark'.
    const benchmarkText = benchName === 'Benchmark' ? '' : ` **'${benchName}'**`;
    const title = threshold === 0 ? '# Performance Report' : '# :warning: **Performance Alert** :warning:';
    const thresholdString = floatStr(threshold);
    const lines = [
        title,
        '',
        `Possible performance regression was detected for benchmark${benchmarkText}.`,
        `Benchmark result of this commit is worse than the previous benchmark result exceeding threshold \`${thresholdString}\`.`,
        '',
        `| Benchmark suite | Current: ${curSuite.commit.id} | Previous: ${prevSuite.commit.id} | Ratio |`,
        '|-|-|-|-|',
    ];

    for (const alert of alerts) {
        const { current, prev, ratio } = alert;
        const line = `| \`${current.name}\` | ${strVal(current)} | ${strVal(prev)} | \`${floatStr(ratio)}\` |`;
        lines.push(line);
    }

    // Footer
    lines.push('', commentFooter());

    if (cc.length > 0) {
        lines.push('', `CC: ${cc.join(' ')}`);
    }

    return lines.join('\n');
}
