"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const config_1 = require("./config");
const extract_1 = require("./extract");
const write_1 = require("./write");
async function main() {
    const config = await config_1.configFromJobInput();
    core.debug(`Config extracted from job: ${config}`);
    const bench = await extract_1.extractResult(config);
    core.debug(`Benchmark result was extracted: ${bench}`);
    await write_1.writeBenchmark(bench, config);
    console.log('github-action-benchmark was run successfully!', '\nData:', bench);
}
main().catch(e => core.setFailed(e.message));
//# sourceMappingURL=index.js.map