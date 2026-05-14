/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: ['src/**/*.js', '!src/utils/seed.js'],
  coverageThreshold: { global: { lines: 70 } },
  testTimeout: 15000,
  verbose: true,
};
