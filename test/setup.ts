import { config } from 'dotenv';
import { expect } from 'chai';

// Load environment variables from .env for local development
config();

// Global hooks and utilities to be available across all test suites
before(() => {
  console.log("Setup before all tests");
});

after(() => {
  console.log("Cleanup after all tests");
});

beforeEach(() => {
  console.log("Setup before each test");
});

afterEach(() => {
  console.log("Cleanup after each test");
});

// Exporting expect so it can be used directly in test files
export { expect };
