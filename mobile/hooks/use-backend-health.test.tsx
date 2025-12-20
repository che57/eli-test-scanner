import React from 'react';
import { renderHook } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { testStripsApi } from '@/store/api/testStripsApi';
import { useBackendHealth } from './use-backend-health';

/**
 * Tests for useBackendHealth hook
 * Verifies that the hook correctly integrates with RTK Query for health checks
 */
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

  const createWrapper = () => {
    return ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );
  };

  it('should return initial loading state', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useBackendHealth(), { wrapper });

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBe('');
    expect(result.current.error).toBeNull();
  });

  it('should structure return value with required properties', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useBackendHealth(), { wrapper });

    expect(result.current).toHaveProperty('data');
    expect(result.current).toHaveProperty('loading');
    expect(result.current).toHaveProperty('error');
  });

  it('should return data as a string type', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useBackendHealth(), { wrapper });

    expect(typeof result.current.data).toBe('string');
  });

  it('should return loading as a boolean type', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useBackendHealth(), { wrapper });

    expect(typeof result.current.loading).toBe('boolean');
  });
});
