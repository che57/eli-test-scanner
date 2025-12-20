import { testStripsApi } from './testStripsApi';
import { SubmissionItem, UploadResponse } from './testStripsApi';

describe('testStripsApi - RTK Query', () => {
  describe('uploadPhoto mutation', () => {
    it('should have uploadPhoto mutation defined', () => {
      const uploadMutation = testStripsApi.endpoints.uploadPhoto;
      expect(uploadMutation).toBeDefined();
      expect(uploadMutation.Types.async).toBeDefined();
    });

    it('should create POST request to test-strips/upload', () => {
      const uploadMutation = testStripsApi.endpoints.uploadPhoto;
      const formData = new FormData();
      formData.append('image', new Blob(), 'test.jpg');

      // The query function should be callable with FormData
      const queryResult = (uploadMutation as unknown as { queryFn: (arg: FormData) => unknown }).queryFn(formData);
      expect(queryResult).toEqual({
        url: 'test-strips/upload',
        method: 'POST',
        body: formData,
      });
    });

    it('should invalidate Submissions tag after upload', () => {
      const uploadMutation = testStripsApi.endpoints.uploadPhoto;
      expect((uploadMutation as unknown as { invalidatesTags: string[] }).invalidatesTags).toEqual(['Submissions']);
    });
  });

  describe('getSubmissions query', () => {
    it('should have getSubmissions query defined', () => {
      const getQuery = testStripsApi.endpoints.getSubmissions;
      expect(getQuery).toBeDefined();
    });

    it('should fetch from test-strips/list endpoint', () => {
      const getQuery = testStripsApi.endpoints.getSubmissions;
      const queryResult = (getQuery as unknown as { queryFn: () => string }).queryFn();
      expect(queryResult).toBe('test-strips/list');
    });

    it('should transform array response', () => {
      const getQuery = testStripsApi.endpoints.getSubmissions;
      const mockResponse: SubmissionItem[] = [
        {
          id: '1',
          qrCode: 'ELI-2024-ABC',
          status: 'success',
          createdAt: '2024-12-19T00:00:00Z',
          isExpired: false,
        },
      ];

      const transformed = (getQuery as unknown as { transformResponse: (response: unknown) => SubmissionItem[] }).transformResponse(mockResponse);
      expect(transformed).toEqual(mockResponse);
    });

    it('should handle {submissions: []} response shape', () => {
      const getQuery = testStripsApi.endpoints.getSubmissions;
      const mockResponse = {
        submissions: [
          {
            id: '1',
            qrCode: 'ELI-2024-ABC',
            status: 'success' as const,
            createdAt: '2024-12-19T00:00:00Z',
          },
        ],
      };

      const transformed = (getQuery as unknown as { transformResponse: (response: unknown) => SubmissionItem[] }).transformResponse(mockResponse);
      expect(Array.isArray(transformed)).toBe(true);
      expect(transformed[0].qrCode).toBe('ELI-2024-ABC');
    });

    it('should handle {items: []} response shape', () => {
      const getQuery = testStripsApi.endpoints.getSubmissions;
      const mockResponse = {
        items: [
          {
            id: '1',
            qrCode: 'ELI-2024-ABC',
            status: 'success' as const,
            createdAt: '2024-12-19T00:00:00Z',
          },
        ],
      };

      const transformed = (getQuery as unknown as { transformResponse: (response: unknown) => SubmissionItem[] }).transformResponse(mockResponse);
      expect(Array.isArray(transformed)).toBe(true);
      expect(transformed.length).toBe(1);
    });

    it('should return empty array for invalid response', () => {
      const getQuery = testStripsApi.endpoints.getSubmissions;
      const mockResponse = { invalid: 'data' };

      const transformed = (getQuery as unknown as { transformResponse: (response: unknown) => SubmissionItem[] }).transformResponse(mockResponse);
      expect(transformed).toEqual([]);
    });

    it('should provide Submissions tag', () => {
      const getQuery = testStripsApi.endpoints.getSubmissions;
      expect((getQuery as unknown as { providesTags: string[] }).providesTags).toEqual(['Submissions']);
    });
  });

  describe('checkHealth query', () => {
    it('should have checkHealth query defined', () => {
      const healthQuery = testStripsApi.endpoints.checkHealth;
      expect(healthQuery).toBeDefined();
    });

    it('should fetch from health endpoint', () => {
      const healthQuery = testStripsApi.endpoints.checkHealth;
      const queryResult = (healthQuery as unknown as { queryFn: () => string }).queryFn();
      expect(queryResult).toBe('health');
    });

    it('should poll every 30 seconds', () => {
      const healthQuery = testStripsApi.endpoints.checkHealth;
      expect((healthQuery as unknown as { pollingInterval: number }).pollingInterval).toBe(30_000);
    });
  });

  describe('baseQuery configuration', () => {
    it('should export testStripsApi with correct reducerPath', () => {
      expect(testStripsApi.reducerPath).toBe('testStripsApi');
    });

    it('should have Submissions in tagTypes', () => {
      expect(testStripsApi.tagTypes).toContain('Submissions');
    });
  });
});
