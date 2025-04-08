const nextJest = require('next/jest')(); // Lädt automatisch .env, etc.

/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'jest-environment-jsdom', // Simuliert Browser-Umgebung
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'], // Für zusätzliche Setups
  preset: 'ts-jest', // Für TypeScript-Unterstützung
  moduleNameMapper: {
    // Aliase aus tsconfig.json übernehmen (falls vorhanden)
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};

module.exports = nextJest(config);
