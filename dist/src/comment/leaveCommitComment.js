"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.leaveCommitComment = leaveCommitComment;
const github = __importStar(require("@actions/github"));
const core = __importStar(require("@actions/core"));
const benchmarkCommentTags_1 = require("./benchmarkCommentTags");
async function leaveCommitComment(repoOwner, repoName, commitId, body, commentId, token) {
    core.debug('leaveCommitComment start');
    const client = github.getOctokit(token);
    const response = await client.rest.repos.createCommitComment({
        owner: repoOwner,
        repo: repoName,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        commit_sha: commitId,
        body: (0, benchmarkCommentTags_1.wrapBodyWithBenchmarkTags)(commentId, body),
    });
    console.log(`Comment was sent to ${response.url}. Response:`, response.status, response.data);
    core.debug('leaveCommitComment end');
    return response;
}
//# sourceMappingURL=leaveCommitComment.js.map