/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
    globals: {
        'ts-jest': {
            tsconfig: 'tsconfig.spec.json',
            isolatedModules: true,
        },
    },
    preset: 'ts-jest',
    testEnvironment: 'node',
};
