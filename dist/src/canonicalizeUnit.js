"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canonicalizeUnit = canonicalizeUnit;
function canonicalizeUnit(u) {
    return u.trim().toLowerCase().replace(/µs|μs/g, 'us');
}
//# sourceMappingURL=canonicalizeUnit.js.map