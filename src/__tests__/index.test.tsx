import React from 'react';
import { Platform, Text } from 'react-native';
import { render, renderHook, screen } from '@testing-library/react-native';
import RCTDeviceEventEmitter from 'react-native/Libraries/EventEmitter/RCTDeviceEventEmitter';

import {
  disableFullProtection,
  enableFullProtection,
  SecureView,
  useScreenRecordingDetection,
  useScreenSecurity,
} from '../index';
import { mockSetAppSwitcherBlur, mockSetSecureWindow } from '../../__mocks__/NativeScreenSecurity';

describe('useScreenSecurity', () => {
  const originalPlatform = Platform.OS;

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: originalPlatform });
    jest.restoreAllMocks();
  });

  it('enables and disables global secure window on mount and unmount', () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });

    const { unmount } = renderHook(() => useScreenSecurity({ protectionLevel: 'global' }));

    expect(mockSetSecureWindow).toHaveBeenCalledWith(true);

    unmount();

    expect(mockSetSecureWindow).toHaveBeenCalledWith(false);
  });

  it('issues ref-count deltas for two global hook instances', () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });

    const first = renderHook(() => useScreenSecurity({ protectionLevel: 'global' }));
    const second = renderHook(() => useScreenSecurity({ protectionLevel: 'global' }));

    expect(mockSetSecureWindow).toHaveBeenCalledTimes(2);
    expect(mockSetSecureWindow).toHaveBeenNthCalledWith(1, true);
    expect(mockSetSecureWindow).toHaveBeenNthCalledWith(2, true);

    first.unmount();

    expect(mockSetSecureWindow).toHaveBeenCalledTimes(3);
    expect(mockSetSecureWindow).toHaveBeenNthCalledWith(3, false);

    second.unmount();

    expect(mockSetSecureWindow).toHaveBeenCalledTimes(4);
    expect(mockSetSecureWindow).toHaveBeenNthCalledWith(4, false);
  });

  it('does not call native module when enabled is false', () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });

    renderHook(() => useScreenSecurity({ protectionLevel: 'global', enabled: false }));

    expect(mockSetSecureWindow).not.toHaveBeenCalled();
    expect(mockSetAppSwitcherBlur).not.toHaveBeenCalled();
  });

  it('enables app switcher blur on iOS when blur is true', () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });

    const { unmount } = renderHook(() => useScreenSecurity({ blur: true, blurStyle: 'dark' }));

    expect(mockSetAppSwitcherBlur).toHaveBeenCalledWith(true, 'dark');

    unmount();

    expect(mockSetAppSwitcherBlur).toHaveBeenCalledWith(false, 'system');
  });

  it('warns once on Android component mode in development', () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    renderHook(() => useScreenSecurity());
    renderHook(() => useScreenSecurity());

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(
      '[react-native-screen-security] Android component mode requires <SecureView> or <SecureWindowAnchor /> in the tree.',
    );
  });
});

describe('imperative protection API', () => {
  const originalPlatform = Platform.OS;

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: originalPlatform });
  });

  it('calls ref-count deltas for enableFullProtection and disableFullProtection', () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });

    enableFullProtection('dark');
    disableFullProtection();

    expect(mockSetSecureWindow).toHaveBeenNthCalledWith(1, true);
    expect(mockSetSecureWindow).toHaveBeenNthCalledWith(2, false);
    expect(mockSetAppSwitcherBlur).toHaveBeenNthCalledWith(1, true, 'dark');
    expect(mockSetAppSwitcherBlur).toHaveBeenNthCalledWith(2, false, 'system');
  });
});

describe('useScreenRecordingDetection', () => {
  const originalPlatform = Platform.OS;

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: originalPlatform });
    jest.restoreAllMocks();
  });

  it('warns once on Android in development', () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    renderHook(() => useScreenRecordingDetection(jest.fn()));
    renderHook(() => useScreenRecordingDetection(jest.fn()));

    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it('passes ScreenRecordingEvent object to the callback', () => {
    const callback = jest.fn();

    renderHook(() => useScreenRecordingDetection(callback));

    RCTDeviceEventEmitter.emit('onScreenRecordingStatusChanged', { isCaptured: true });

    expect(callback).toHaveBeenCalledWith({ isCaptured: true });
  });
});

describe('SecureView', () => {
  const originalPlatform = Platform.OS;

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: originalPlatform });
  });

  it('applies flex fill style when fill is true on iOS', () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });

    render(
      <SecureView fill testID="secure-view">
        <Text>Secret</Text>
      </SecureView>,
    );

    expect(screen.getByTestId('secure-view-native')).toHaveStyle({ flex: 1 });
  });

  it('renders a plain View when enabled is false', () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });

    render(
      <SecureView enabled={false} testID="plain-view">
        <Text>Public</Text>
      </SecureView>,
    );

    expect(screen.getByTestId('plain-view')).toBeOnTheScreen();
    expect(screen.queryByTestId('secure-view-native')).toBeNull();
  });
});
