import { useEffect, useRef } from 'react';
import { type EmitterSubscription, NativeEventEmitter, Platform } from 'react-native';

import NativeScreenSecurity from './NativeScreenSecurity';

export { SecureView } from './SecureView';
export type { SecureViewProps } from './SecureView';

export type BlurStyle = 'light' | 'dark' | 'system';

export type ProtectionLevel = 'component' | 'global';

export interface ScreenSecurityOptions {
  /**
   * `'component'` (default) — iOS: only `<SecureView>`-wrapped content is
   * GPU-blanked during screenshots/recordings.
   * Android: `FLAG_SECURE` follows the native Fragment lifecycle of the screen
   * hosting `<SecureView>` (or `<SecureWindowAnchor />`), so tab navigation
   * correctly clears protection when leaving a secured tab.
   *
   * `'global'` — the entire window is protected on both platforms.
   */
  protectionLevel?: ProtectionLevel;
  blur?: boolean;
  blurStyle?: BlurStyle;
}

const emitter = new NativeEventEmitter(NativeScreenSecurity);

export function setSecureWindow(enable: boolean): void {
  NativeScreenSecurity.setSecureWindow(enable);
}

export function setAppSwitcherBlur(enable: boolean, style: BlurStyle = 'system'): void {
  NativeScreenSecurity.setAppSwitcherBlur(enable, style);
}

export function onScreenshotTaken(callback: () => void): EmitterSubscription {
  return emitter.addListener('onScreenshotTaken', callback);
}

export function onScreenRecordingStatusChanged(
  callback: (event: { isCaptured: boolean }) => void,
): EmitterSubscription {
  return emitter.addListener('onScreenRecordingStatusChanged', callback);
}

export function enableFullProtection(blurStyle: BlurStyle = 'system'): void {
  setSecureWindow(true);
  if (Platform.OS === 'ios') {
    setAppSwitcherBlur(true, blurStyle);
  }
}

export function disableFullProtection(): void {
  setSecureWindow(false);
  if (Platform.OS === 'ios') {
    setAppSwitcherBlur(false, 'system');
  }
}

/**
 * Enables screen protection for the mounted lifetime of the calling component.
 *
 * - iOS `'component'` level: activates app-switcher blur; wrap sensitive
 *   content in `<SecureView>` for per-element GPU blanking.
 * - Android `'component'` level: wrap content in `<SecureView>` (or place a
 *   zero-size `<SecureWindowAnchor />` at the screen root). Protection is
 *   bound to the native Fragment lifecycle — switching tabs clears FLAG_SECURE
 *   when a non-secured tab is shown.
 * - `'global'` level: ref-counted window protection on both platforms.
 *
 * Place on any screen that needs protection. Use at App root to secure the
 * entire app (`protectionLevel: 'global'`).
 */
export function useScreenSecurity(options: ScreenSecurityOptions = {}): void {
  const { protectionLevel = 'component', blur = true, blurStyle = 'system' } = options;

  useEffect(() => {
    const isGlobal = protectionLevel === 'global';

    if (isGlobal) {
      setSecureWindow(true);
    }

    if (Platform.OS === 'ios' && blur) {
      setAppSwitcherBlur(true, blurStyle);
    }

    return () => {
      if (isGlobal) {
        setSecureWindow(false);
      }
      if (Platform.OS === 'ios') {
        setAppSwitcherBlur(false, 'system');
      }
    };
  }, [protectionLevel, blur, blurStyle]);
}

export function useScreenshotDetection(callback: () => void): void {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const subscription = onScreenshotTaken(() => callbackRef.current());
    return () => subscription.remove();
  }, []);
}

export function useScreenRecordingDetection(callback: (isCaptured: boolean) => void): void {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const subscription = onScreenRecordingStatusChanged(event =>
      callbackRef.current(event.isCaptured),
    );
    return () => subscription.remove();
  }, []);
}

export default {
  setSecureWindow,
  setAppSwitcherBlur,
  onScreenshotTaken,
  onScreenRecordingStatusChanged,
  enableFullProtection,
  disableFullProtection,
};
