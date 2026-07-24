/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/test/e2e'],
  testMatch: ['**/*.e2e.spec.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  testTimeout: 60000,
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          esModuleInterop: true,
          module: 'commonjs',
          target: 'ES2020',
          types: ['jest', 'node'],
          strict: false,
          skipLibCheck: true,
        },
      },
    ],
  },
};
