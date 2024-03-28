const BENCHMARK_COMMENT_TAG = 'github-benchmark-action-comment';

export function benchmarkStartTag(commentId: string) {
    return `<!-- ${BENCHMARK_COMMENT_TAG}(start): ${commentId} -->`;
}

export function benchmarkEndTag(commentId: string) {
    return `<!-- ${BENCHMARK_COMMENT_TAG}(end): ${commentId} -->`;
}

export function wrapBodyWithBenchmarkTags(commentId: string, body: string) {
    return `${benchmarkStartTag(commentId)}\n${body}\n${benchmarkEndTag(commentId)}`;
}
