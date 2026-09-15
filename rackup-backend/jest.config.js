/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.spec.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  clearMocks: true,
  globals: {
    'ts-jest': {
      tsconfig: {
        esModuleInterop: true,
        module: 'commonjs',
        target: 'ES2020',
        types: ['jest', 'node'],
        strict: false,
        skipLibCheck: true,
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
      },
    },
  },
};
