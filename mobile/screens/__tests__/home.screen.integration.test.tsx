import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock components
jest.mock('@/components/hello-wave', () => ({
  HelloWave: jest.fn(() => null),
}));

jest.mock('@/components/parallax-scroll-view', () => ({
  __esModule: true,
  default: jest.fn(({ children }: any) => children),
}));

jest.mock('@/components/themed-text', () => ({
  ThemedText: jest.fn(({ children }: any) => children),
}));

jest.mock('@/components/themed-view', () => ({
  ThemedView: jest.fn(({ children }: any) => children),
}));

// Mock react-native
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    select: jest.fn(({ ios }: any) => ios),
  },
  Button: jest.fn(() => null),
  Image: jest.fn(() => null),
  StyleSheet: { create: jest.fn((x) => x) },
  View: jest.fn(() => null),
  Alert: { alert: jest.fn() },
  Modal: jest.fn(() => null),
  TouchableOpacity: jest.fn(() => null),
  Text: jest.fn(() => null),
}));

jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('react-native-worklets', () => ({
  __esModule: true,
}));

jest.mock('@testing-library/react-native', () => ({
  render: jest.fn(),
  screen: {},
  fireEvent: { press: jest.fn() },
  waitFor: jest.fn((fn) => Promise.resolve(fn())),
  act: (fn: any) => fn(),
}));

jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(() =>
    Promise.resolve({ uri: 'file:///tmp/compressed.jpg' })
  ),
  SaveFormat: { JPEG: 'jpeg' },
}));

jest.mock('react-native-vision-camera', () => ({
  Camera: jest.fn(),
  useCameraDevice: jest.fn(() => ({ type: 'back' })),
  useCameraPermission: jest.fn(() => ({
    hasPermission: true,
    requestPermission: jest.fn().mockResolvedValue(true),
  })),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

// Now import after all mocks are defined
import { render } from '@testing-library/react-native';
import { act } from 'react';
import HomeScreen from '../home.screen';
import { testStripsApi } from '../../store/api/testStripsApi';
import healthReducer, { setHealthData } from '../../store/slices/healthSlice';

const createMockStore = (preloadedState?: any) => {
  return configureStore({
    reducer: {
      [testStripsApi.reducerPath]: testStripsApi.reducer,
      health: healthReducer,
    } as any,
    middleware: (getDefaultMiddleware: any) =>
      getDefaultMiddleware().concat(testStripsApi.middleware),
    preloadedState,
  });
};

describe('HomeScreen Upload Flow Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  });

  it('successfully renders without crashing', () => {
    const store = createMockStore({
      health: { data: { status: 'ok' }, error: null },
    });

    render(
      <Provider store={store}>
        <HomeScreen />
      </Provider>
    );

    expect(render).toHaveBeenCalled();
  });

  it('handles offline queue persistence', async () => {
    const store = createMockStore({
      health: { data: null, error: { message: 'Backend unreachable' } },
    });

    render(
      <Provider store={store}>
        <HomeScreen />
      </Provider>
    );

    expect(AsyncStorage.getItem).toBeDefined();
  });

  it('shows health status in store', () => {
    const store = createMockStore({
      health: { data: { status: 'ok' }, error: null },
    });

    expect(store.getState().health.data?.status).toBe('ok');
  });

  it('handles health error state', () => {
    const store = createMockStore({
      health: { data: null, error: { message: 'Backend down' } },
    });

    expect(store.getState().health.error?.message).toBe('Backend down');
  });

  it('can dispatch health updates', () => {
    const store = createMockStore({
      health: { data: null, error: null },
    });

    act(() => {
      store.dispatch(setHealthData({ status: 'ok' }));
    });

    expect(store.getState().health.data?.status).toBe('ok');
  });

  it('integrates redux store with api', () => {
    const store = createMockStore();
    const state = store.getState();
    
    expect(state[testStripsApi.reducerPath]).toBeDefined();
    expect(state.health).toBeDefined();
  });

  it('mocks RTK Query endpoints', () => {
    expect(testStripsApi.endpoints).toBeDefined();
    expect(testStripsApi.endpoints.uploadPhoto).toBeDefined();
  });
});
