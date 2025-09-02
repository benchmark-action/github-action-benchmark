"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canonicalizeUnit = void 0;
function canonicalizeUnit(u) {
    return u.trim().toLowerCase().replace(/µs|μs/g, 'us');
}
exports.canonicalizeUnit = canonicalizeUnit;
//# sourceMappingURL=canonicalizeUnit.js.map