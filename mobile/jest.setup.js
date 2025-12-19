import '@testing-library/jest-native/extend-expect';

jest.mock('react-native/Libraries/EventEmitter/NativeEventEmitter');

// Mock expo-camera
jest.mock('expo-camera', () => ({
  Camera: jest.fn(),
  useCameraPermission: jest.fn(() => ({
    hasPermission: true,
    requestPermission: jest.fn(),
  })),
}));

// Mock react-native-vision-camera
jest.mock('react-native-vision-camera', () => ({
  Camera: jest.fn(),
  useCameraDevice: jest.fn(() => ({ type: 'back' })),
  useCameraPermission: jest.fn(() => ({
    hasPermission: true,
    requestPermission: jest.fn(),
  })),
}));

// Mock react navigation
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useIsFocused: jest.fn(() => true),
}));

// Suppress warnings during tests
const originalWarn = console.warn;
const originalError = console.error;

beforeAll(() => {
  console.warn = jest.fn((...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Non-serializable values') ||
        args[0].includes('Animated') ||
        args[0].includes('VirtualizedList'))
    ) {
      return;
    }
    originalWarn.call(console, ...args);
  });

  console.error = jest.fn((...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Animated') || args[0].includes('VirtualizedList'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  });
});

afterAll(() => {
  console.warn = originalWarn;
  console.error = originalError;
});
