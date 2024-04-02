"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wrapBodyWithBenchmarkTags = exports.benchmarkEndTag = exports.benchmarkStartTag = void 0;
const BENCHMARK_COMMENT_TAG = 'github-benchmark-action-comment';
function benchmarkStartTag(commentId) {
    return `<!-- ${BENCHMARK_COMMENT_TAG}(start): ${commentId} -->`;
}
exports.benchmarkStartTag = benchmarkStartTag;
function benchmarkEndTag(commentId) {
    return `<!-- ${BENCHMARK_COMMENT_TAG}(end): ${commentId} -->`;
}
exports.benchmarkEndTag = benchmarkEndTag;
function wrapBodyWithBenchmarkTags(commentId, body) {
    return `${benchmarkStartTag(commentId)}\n${body}\n${benchmarkEndTag(commentId)}`;
}
exports.wrapBodyWithBenchmarkTags = wrapBodyWithBenchmarkTags;
//# sourceMappingURL=benchmarkCommentTags.js.map