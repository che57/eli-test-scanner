jest.mock('react-native/Libraries/EventEmitter/NativeEventEmitter');

// Mock react-native itself
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    select: jest.fn(({ ios }) => ios),
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

// Mock react-native-vision-camera
jest.mock('react-native-vision-camera', () => ({
  Camera: jest.fn(),
  useCameraDevice: jest.fn(() => ({ type: 'back' })),
  useCameraPermission: jest.fn(() => ({
    hasPermission: true,
    requestPermission: jest.fn(),
  })),
}));

// Suppress console warnings during tests
const originalWarn = console.warn;
const originalError = console.error;

beforeAll(() => {
  console.warn = jest.fn((...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Non-serializable values') ||
        args[0].includes('Animated') ||
        args[0].includes('VirtualizedList') ||
        args[0].includes('Warning'))
    ) {
      return;
    }
    originalWarn.call(console, ...args);
  });

  console.error = jest.fn((...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Animated') ||
        args[0].includes('VirtualizedList') ||
        args[0].includes('Warning') ||
        args[0].includes('Unrecognized font name'))
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
