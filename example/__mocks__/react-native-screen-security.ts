export const SecureView = ({ children }: { children?: React.ReactNode }) =>
  children;

export function useScreenSecurity(): void {}
export function useScreenshotDetection(): void {}
export function useScreenRecordingDetection(): void {}
export function getSecurityState() {
  return { secureWindowActive: false, appSwitcherBlurActive: false };
}
export function setAppSwitcherBlur(): void {}
export function enableFullProtection(): void {}
export function disableFullProtection(): void {}
