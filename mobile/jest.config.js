module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: ['**/?(*.)+(spec|test).[tj]s?(x)'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transform: {
    '^.+\\.(tsx?|jsx?)$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        '@babel/preset-typescript',
        '@babel/preset-react'
      ],
      plugins: [
        '@babel/plugin-transform-flow-strip-types'
      ]
    }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native-reanimated|expo)/)',
  ],
  collectCoverageFrom: [
    'screens/**/*.{ts,tsx}',
    'store/**/*.{ts,tsx}',
    '!**/*.test.{ts,tsx}',
  ],
};
