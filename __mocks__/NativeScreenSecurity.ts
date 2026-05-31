export const mockSetSecureWindow = jest.fn();
export const mockSetAppSwitcherBlur = jest.fn();
export const mockAddListener = jest.fn();
export const mockRemoveListeners = jest.fn();

const NativeScreenSecurity = {
  setSecureWindow: mockSetSecureWindow,
  setAppSwitcherBlur: mockSetAppSwitcherBlur,
  addListener: mockAddListener,
  removeListeners: mockRemoveListeners,
};

export default NativeScreenSecurity;
