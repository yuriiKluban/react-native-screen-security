/* global jest */

jest.mock('./src/NativeScreenSecurity', () => require('./__mocks__/NativeScreenSecurity'));

jest.mock('./src/SecureViewNativeComponent', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    __esModule: true,
    default: React.forwardRef((props, ref) => React.createElement(View, { ...props, ref, testID: 'secure-view-native' })),
  };
});

jest.mock('./src/SecureWindowAnchorNative', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    __esModule: true,
    default: React.forwardRef((props, ref) =>
      React.createElement(View, { ...props, ref, testID: 'secure-window-anchor-native' }),
    ),
  };
});

beforeEach(() => {
  const { mockSetSecureWindow, mockSetAppSwitcherBlur } = require('./__mocks__/NativeScreenSecurity');
  mockSetSecureWindow.mockClear();
  mockSetAppSwitcherBlur.mockClear();
});
