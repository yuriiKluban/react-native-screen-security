import { useEffect, useLayoutEffect, useRef } from 'react';
import { type EmitterSubscription, NativeEventEmitter, Platform } from 'react-native';

import NativeScreenSecurity, { type SecurityState } from './NativeScreenSecurity';

export { SecureView } from './SecureView';
export type { SecureViewProps } from './SecureView';
export { SecureWindowAnchor } from './SecureWindowAnchor';
export type { SecurityState } from './NativeScreenSecurity';

export type BlurStyle = 'light' | 'dark' | 'system' | 'extraLight';

export type ProtectionLevel = 'component' | 'global';

export type ScreenRecordingEvent = { isCaptured: boolean };

export type ScreenshotEvent = Record<string, never>;

export type SecurityToken = { release: () => void };

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
  /** When `false`, the hook is a no-op. Default `true`. */
  enabled?: boolean;
}

let _emitter: NativeEventEmitter | null = null;

function getEmitter(): NativeEventEmitter {
  if (!_emitter) {
    _emitter = new NativeEventEmitter(NativeScreenSecurity);
  }
  return _emitter;
}

let androidComponentModeWarningShown = false;
let recordingDetectionWarningShown = false;

export function setSecureWindow(enable: boolean): void {
  NativeScreenSecurity.setSecureWindow(enable);
}

/**
 * Blurs the app window in the iOS app switcher.
 * @platform ios
 */
export function setAppSwitcherBlur(enable: boolean, style: BlurStyle = 'system'): void {
  NativeScreenSecurity.setAppSwitcherBlur(enable, style);
}

export function getSecurityState(): SecurityState {
  return NativeScreenSecurity.getSecurityState();
}

/**
 * Acquires global window protection. Call `release()` when done (idempotent).
 */
export function acquireSecureWindow(): SecurityToken {
  let released = false;
  setSecureWindow(true);
  return {
    release() {
      if (released) return;
      released = true;
      setSecureWindow(false);
    },
  };
}

/**
 * Acquires iOS app-switcher blur. Call `release()` when done (idempotent).
 * @platform ios
 */
export function acquireAppSwitcherBlur(style: BlurStyle = 'system'): SecurityToken {
  let released = false;
  setAppSwitcherBlur(true, style);
  return {
    release() {
      if (released) return;
      released = true;
      setAppSwitcherBlur(false, 'system');
    },
  };
}

export function onScreenshotTaken(callback: () => void): EmitterSubscription {
  return getEmitter().addListener('onScreenshotTaken', callback);
}

/**
 * Subscribe to screen recording status changes.
 * @platform ios
 */
export function onScreenRecordingStatusChanged(
  callback: (event: ScreenRecordingEvent) => void,
): EmitterSubscription {
  return getEmitter().addListener('onScreenRecordingStatusChanged', callback);
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
  const { enabled = true, protectionLevel = 'component', blur = true, blurStyle = 'system' } = options;

  useEffect(() => {
    if (!enabled) {
      return;
    }

    if (
      __DEV__ &&
      Platform.OS === 'android' &&
      protectionLevel === 'component' &&
      !androidComponentModeWarningShown
    ) {
      androidComponentModeWarningShown = true;
      console.warn(
        '[react-native-screen-security] Android component mode requires <SecureView> or <SecureWindowAnchor /> in the tree.',
      );
    }

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
  }, [enabled, protectionLevel, blur, blurStyle]);
}

export function useScreenshotDetection(callback: () => void): void {
  const callbackRef = useRef(callback);

  useLayoutEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const subscription = onScreenshotTaken(() => callbackRef.current());
    return () => subscription.remove();
  }, []);
}

/**
 * React hook for screen recording detection.
 * @platform ios
 */
export function useScreenRecordingDetection(callback: (event: ScreenRecordingEvent) => void): void {
  const callbackRef = useRef(callback);

  useLayoutEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (__DEV__ && Platform.OS === 'android' && !recordingDetectionWarningShown) {
      recordingDetectionWarningShown = true;
      console.warn('[react-native-screen-security] useScreenRecordingDetection is iOS-only.');
    }

    const subscription = onScreenRecordingStatusChanged(event =>
      callbackRef.current({ isCaptured: event.isCaptured }),
    );
    return () => subscription.remove();
  }, []);
}
