"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const path = __importStar(require("path"));
const io = __importStar(require("@actions/io"));
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
const git = __importStar(require("./git"));
const default_index_html_1 = require("./default_index_html");
const SCRIPT_PREFIX = 'window.BENCHMARK_DATA = ';
async function loadDataJson(dataPath) {
    try {
        const script = await fs_1.promises.readFile(dataPath, 'utf8');
        const json = script.slice(SCRIPT_PREFIX.length);
        const parsed = JSON.parse(json);
        core.debug(`Loaded data.js at ${dataPath}`);
        return parsed;
    }
    catch (err) {
        console.log(`Could not find data.js at ${dataPath}. Using empty default: ${err}`);
        return {
            lastUpdate: 0,
            repoUrl: '',
            entries: {},
        };
    }
}
async function storeDataJson(dataPath, data) {
    const script = SCRIPT_PREFIX + JSON.stringify(data, null, 2);
    await fs_1.promises.writeFile(dataPath, script, 'utf8');
    core.debug(`Overwrote ${dataPath} for adding new data`);
}
function addBenchmark(entries, name, bench) {
    if (entries[name] === undefined) {
        entries[name] = [];
        core.debug(`No entry found for benchmark '${name}'. Created.`);
    }
    entries[name].push(bench);
}
async function addIndexHtmlIfNeeded(dir) {
    const indexHtml = path.join(dir, 'index.html');
    try {
        await fs_1.promises.stat(indexHtml);
        core.debug(`Skipped to create default index.html since it is already existing: ${indexHtml}`);
        return;
    }
    catch (_) {
        // Continue
    }
    await fs_1.promises.writeFile(indexHtml, default_index_html_1.DEFAULT_INDEX_HTML, 'utf8');
    await git.cmd('add', indexHtml);
    console.log('Created default index.html at', indexHtml);
}
async function pushGitHubPages(token, branch) {
    try {
        await git.push(token, branch);
        return;
    }
    catch (err) {
        if (!(err instanceof Error) || !err.message.includes('[remote rejected]')) {
            throw err;
        }
        // Fall through
    }
    core.warning('Auto push failed because remote seemed to be updated after git pull. Retrying...');
    // Retry push after pull with rebasing
    await git.pull(token, branch, '--rebase');
    await git.push(token, branch);
    core.debug('Retrying auto push was successfully done');
}
async function writeBenchmark(bench, config) {
    var _a, _b, _c, _d;
    const { name, tool, ghPagesBranch, benchmarkDataDirPath, githubToken, autoPush } = config;
    const dataPath = path.join(benchmarkDataDirPath, 'data.js');
    /* eslint-disable @typescript-eslint/camelcase */
    const htmlUrl = (_b = (_a = github.context.payload.repository) === null || _a === void 0 ? void 0 : _a.html_url, (_b !== null && _b !== void 0 ? _b : ''));
    const isPrivateRepo = (_d = (_c = github.context.payload.repository) === null || _c === void 0 ? void 0 : _c.private, (_d !== null && _d !== void 0 ? _d : false));
    /* eslint-enable @typescript-eslint/camelcase */
    await git.cmd('switch', ghPagesBranch);
    try {
        if (!isPrivateRepo || githubToken) {
            await git.pull(githubToken, ghPagesBranch);
        }
        else if (isPrivateRepo) {
            core.warning("'git pull' was skipped. If you want to ensure GitHub Pages branch is up-to-date " +
                "before generating a commit, please set 'github-token' input to pull GitHub pages branch");
        }
        await io.mkdirP(benchmarkDataDirPath);
        const data = await loadDataJson(dataPath);
        data.lastUpdate = Date.now();
        data.repoUrl = htmlUrl;
        addBenchmark(data.entries, name, bench);
        await storeDataJson(dataPath, data);
        await git.cmd('add', dataPath);
        await addIndexHtmlIfNeeded(benchmarkDataDirPath);
        await git.cmd('commit', '-m', `add ${name} (${tool}) benchmark result for ${bench.commit.id}`);
        if (githubToken && autoPush) {
            await pushGitHubPages(githubToken, ghPagesBranch);
            console.log(`Automatically pushed the generated commit to ${ghPagesBranch} branch since 'auto-push' is set to true`);
        }
        else {
            core.debug(`Auto-push to ${ghPagesBranch} is skipped because it requires both github-token and auto-push`);
        }
    }
    finally {
        // `git switch` does not work for backing to detached head
        await git.cmd('checkout', '-');
    }
}
exports.writeBenchmark = writeBenchmark;
//# sourceMappingURL=write.js.map