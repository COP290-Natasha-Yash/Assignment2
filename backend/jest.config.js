module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testMatch: ['**/*.test.ts'],
    setupFiles: ['dotenv/config'],
    globalSetup: './src/tests/setup.ts',
    globalTeardown: './src/tests/teardown.ts',
};