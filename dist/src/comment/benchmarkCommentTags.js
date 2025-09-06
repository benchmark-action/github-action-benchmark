"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.benchmarkStartTag = benchmarkStartTag;
exports.benchmarkEndTag = benchmarkEndTag;
exports.wrapBodyWithBenchmarkTags = wrapBodyWithBenchmarkTags;
const BENCHMARK_COMMENT_TAG = 'github-benchmark-action-comment';
function benchmarkStartTag(commentId) {
    return `<!-- ${BENCHMARK_COMMENT_TAG}(start): ${commentId} -->`;
}
function benchmarkEndTag(commentId) {
    return `<!-- ${BENCHMARK_COMMENT_TAG}(end): ${commentId} -->`;
}
function wrapBodyWithBenchmarkTags(commentId, body) {
    return `${benchmarkStartTag(commentId)}\n${body}\n${benchmarkEndTag(commentId)}`;
}
//# sourceMappingURL=benchmarkCommentTags.js.map