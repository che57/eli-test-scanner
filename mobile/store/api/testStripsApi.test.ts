import { testStripsApi } from './testStripsApi';

/**
 * Tests for testStripsApi RTK Query configuration
 * Verifies API endpoints are properly defined
 */
describe('testStripsApi - RTK Query', () => {
  it('should export testStripsApi', () => {
    expect(testStripsApi).toBeDefined();
  });

  it('should define uploadPhoto endpoint', () => {
    expect(testStripsApi.endpoints.uploadPhoto).toBeDefined();
  });

  it('should define getSubmissions endpoint', () => {
    expect(testStripsApi.endpoints.getSubmissions).toBeDefined();
  });

  it('should define checkHealth endpoint', () => {
    expect(testStripsApi.endpoints.checkHealth).toBeDefined();
  });
});
