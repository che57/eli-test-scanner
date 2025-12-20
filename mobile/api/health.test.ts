import { getHealth, type HealthResponse } from '@/api/health';

const originalFetch = global.fetch;

describe('getHealth', () => {
  afterEach(() => {
    // Restore original fetch after each test
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('returns parsed JSON on success', async () => {
    const mockResponse: HealthResponse = { status: 'ok' };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    } as Partial<Response>);

    const data = await getHealth('http://example.com/health');
    expect(data).toEqual(mockResponse);
    expect(global.fetch).toHaveBeenCalledWith('http://example.com/health', expect.objectContaining({
      headers: { Accept: 'application/json' },
    }));
  });

  it('throws on non-OK response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    } as Partial<Response>);

    await expect(getHealth('http://example.com/health')).rejects.toThrow('HTTP 500');
  });
});
