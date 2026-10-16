// ESM entry point: re-exports the CommonJS build with a proper default export.
export * from '../dist/index.js';
export { KeycloakAPI as default } from '../dist/index.js';
