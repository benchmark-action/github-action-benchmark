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
exports.findExistingPRReviewId = void 0;
const github = __importStar(require("@actions/github"));
const benchmarkCommentTags_1 = require("./benchmarkCommentTags");
const core = __importStar(require("@actions/core"));
async function findExistingPRReviewId(repoOwner, repoName, pullRequestNumber, benchName, token) {
    core.debug('findExistingPRReviewId start');
    const client = github.getOctokit(token);
    const existingReviewsResponse = await client.rest.pulls.listReviews({
        owner: repoOwner,
        repo: repoName,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        pull_number: pullRequestNumber,
    });
    const existingReview = existingReviewsResponse.data.find((review) => review.body.startsWith((0, benchmarkCommentTags_1.benchmarkStartTag)(benchName)));
    core.debug('findExistingPRReviewId start');
    return existingReview === null || existingReview === void 0 ? void 0 : existingReview.id;
}
exports.findExistingPRReviewId = findExistingPRReviewId;
//# sourceMappingURL=findExistingPRReviewId.js.map