"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.leavePRComment = void 0;
const github = __importStar(require("@actions/github"));
const benchmarkCommentTags_1 = require("./benchmarkCommentTags");
const findExistingPRReviewId_1 = require("./findExistingPRReviewId");
const core = __importStar(require("@actions/core"));
async function leavePRComment(repoOwner, repoName, pullRequestNumber, body, commentId, token) {
    try {
        core.debug('leavePRComment start');
        const client = github.getOctokit(token);
        const bodyWithTags = (0, benchmarkCommentTags_1.wrapBodyWithBenchmarkTags)(commentId, body);
        const existingCommentId = await (0, findExistingPRReviewId_1.findExistingPRReviewId)(repoOwner, repoName, pullRequestNumber, commentId, token);
        if (!existingCommentId) {
            core.debug('creating new pr comment');
            const createReviewResponse = await client.rest.pulls.createReview({
                owner: repoOwner,
                repo: repoName,
                // eslint-disable-next-line @typescript-eslint/naming-convention
                pull_number: pullRequestNumber,
                event: 'COMMENT',
                body: bodyWithTags,
            });
            console.log(`Comment was created via ${createReviewResponse.url}. Response:`, createReviewResponse.status, createReviewResponse.data);
            core.debug('leavePRComment end');
            return createReviewResponse;
        }
        core.debug('updating existing pr comment');
        const updateReviewResponse = await client.rest.pulls.updateReview({
            owner: repoOwner,
            repo: repoName,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            pull_number: pullRequestNumber,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            review_id: existingCommentId,
            body: bodyWithTags,
        });
        console.log(`Comment was updated via ${updateReviewResponse.url}. Response:`, updateReviewResponse.status, updateReviewResponse.data);
        core.debug('leavePRComment end');
        return updateReviewResponse;
    }
    catch (err) {
        console.log('error', err);
        throw err;
    }
}
exports.leavePRComment = leavePRComment;
//# sourceMappingURL=leavePRComment.js.map