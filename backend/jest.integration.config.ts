import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/integration/**/*.test.ts'],
  globalSetup: '<rootDir>/src/tests/setup.ts',
  maxWorkers: 1,
  testTimeout: 15000,
  testEnvironmentOptions: {
    env: {
      DATABASE_URL: 'file:./test.db',
    },
  },
  globals: {
    'ts-jest': {
      tsconfig: { strict: false },
    },
  },
};

export default config;