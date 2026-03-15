module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  globalSetup: './src/tests/setup.ts',
  globalTeardown: './src/tests/teardown.ts',

  setupFiles: ['./src/tests/env.ts'],
};