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
exports.addBenchmarkEntry = addBenchmarkEntry;
const core = __importStar(require("@actions/core"));
const normalizeBenchmark_1 = require("./normalizeBenchmark");
function addBenchmarkEntry(benchName, benchEntry, entries, maxItems) {
    let prevBench = null;
    let normalizedCurrentBench = benchEntry;
    // Add benchmark result
    if (entries[benchName] === undefined) {
        entries[benchName] = [benchEntry];
        core.debug(`No suite was found for benchmark '${benchName}' in existing data. Created`);
    }
    else {
        const suites = entries[benchName];
        // Get the last suite which has different commit ID for alert comment
        for (const e of [...suites].reverse()) {
            if (e.commit.id !== benchEntry.commit.id) {
                prevBench = e;
                break;
            }
        }
        normalizedCurrentBench = (0, normalizeBenchmark_1.normalizeBenchmark)(prevBench, benchEntry);
        suites.push(normalizedCurrentBench);
        if (maxItems !== null && suites.length > maxItems) {
            suites.splice(0, suites.length - maxItems);
            core.debug(`Number of data items for '${benchName}' was truncated to ${maxItems} due to max-items-in-charts`);
        }
    }
    return { prevBench, normalizedCurrentBench };
}
//# sourceMappingURL=addBenchmarkEntry.js.map