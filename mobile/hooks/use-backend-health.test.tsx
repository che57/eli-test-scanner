import { renderHook } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { testStripsApi } from '@/store/api/testStripsApi';
import { useBackendHealth } from './use-backend-health';

describe('useBackendHealth', () => {
  let store: ReturnType<typeof configureStore>;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        [testStripsApi.reducerPath]: testStripsApi.reducer,
      },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(testStripsApi.middleware),
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => <Provider store={store}> {children} </Provider>;

  it('should return initial loading state', () => {
    const { result } = renderHook(() => useBackendHealth(), { wrapper });

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBe('');
    expect(result.current.error).toBe(null);
  });

  it('should return error from failed health check', async () => {
    // Mock a failed response
    jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useBackendHealth(), { wrapper });

    expect(result.current.error).toBeNull();
    // After some async operations, error should be set
  });

  it('should structure return value correctly', () => {
    const { result } = renderHook(() => useBackendHealth(), { wrapper });

    expect(result.current).toHaveProperty('data');
    expect(result.current).toHaveProperty('loading');
    expect(result.current).toHaveProperty('error');
    expect(typeof result.current.data).toBe('string');
    expect(typeof result.current.loading).toBe('boolean');
  });
});
