module.exports = {
  preset: '@react-native/jest-preset',
  moduleNameMapper: {
    '^react$': require.resolve('react'),
    '^react-test-renderer$': require.resolve('react-test-renderer'),
  },
  modulePathIgnorePatterns: ['<rootDir>/lib/', '<rootDir>/example/'],
  testPathIgnorePatterns: ['<rootDir>/example/'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-native-community|@testing-library/react-native)/)',
  ],
  testMatch: ['**/__tests__/**/*.(test|spec).(ts|tsx)'],
};
