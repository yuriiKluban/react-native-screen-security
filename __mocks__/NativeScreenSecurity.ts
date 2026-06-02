export const mockSetSecureWindow = jest.fn();
export const mockSetAppSwitcherBlur = jest.fn();
export const mockGetSecurityState = jest.fn(() => ({
  secureWindowActive: false,
  appSwitcherBlurActive: false,
}));
export const mockAddListener = jest.fn();
export const mockRemoveListeners = jest.fn();

const NativeScreenSecurity = {
  setSecureWindow: mockSetSecureWindow,
  setAppSwitcherBlur: mockSetAppSwitcherBlur,
  getSecurityState: mockGetSecurityState,
  addListener: mockAddListener,
  removeListeners: mockRemoveListeners,
};

export default NativeScreenSecurity;
