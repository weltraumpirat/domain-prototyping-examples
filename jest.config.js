module.exports = {
  testEnvironment: 'node',
  // This repo is small enough not to need watchman, and a broken/unwritable
  // watchman state dir otherwise crashes the run before any test executes.
  watchman: false,
  roots: ['<rootDir>/lib','<rootDir>/src'],
  testMatch: ['**/*.spec.ts'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },
  setupFilesAfterEnv: ['aws-cdk-lib/testhelpers/jest-autoclean'],
};
