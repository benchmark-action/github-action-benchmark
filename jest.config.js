/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
    globals: {
        'ts-jest': {
            tsconfig: 'tsconfig.spec.json',
        },
    },
    preset: 'ts-jest',
    testEnvironment: 'node',
};
