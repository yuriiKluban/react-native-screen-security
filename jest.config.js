module.exports = {
  preset: '@react-native/jest-preset',
  modulePathIgnorePatterns: ['<rootDir>/lib/', '<rootDir>/example/'],
  testPathIgnorePatterns: ['<rootDir>/example/'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-native-community|@testing-library/react-native)/)',
  ],
  testMatch: ['**/__tests__/**/*.(test|spec).(ts|tsx)'],
};
