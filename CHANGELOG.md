# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `SecureView` — iOS Fabric GPU-blanked container; Android fragment-scoped `FLAG_SECURE` anchor
- `protectionLevel: 'component' | 'global'` on `useScreenSecurity`
- `useScreenRecordingDetection` hook (iOS only)
- Android `FragmentLifecycleCallbacks` integration for tab-safe `FLAG_SECURE` with react-native-screens

### Changed

- Android component-level protection uses native Fragment lifecycle instead of global ref-count
- Documented peer dependency: React Native `>= 0.79` (New Architecture required)

## [1.0.0] - 2026-05-29

### Added

- TurboModule implementation for React Native New Architecture (`RTNScreenSecurity`)
- `setSecureWindow(enable)` — blocks screen capture and screenshots
  - iOS: secure `UITextField` canvas layer overlay
  - Android: `FLAG_SECURE` with Activity queue for early calls
- `setAppSwitcherBlur(enable, style)` — iOS app switcher blur (`light`, `dark`, `system`)
- `onScreenshotTaken` event for screenshot and screen capture detection
  - iOS: `userDidTakeScreenshot` + `UIScreen.capturedDidChangeNotification`
  - Android: `Activity.ScreenCaptureCallback` (API 34+) + `ContentObserver` fallback
- JavaScript API: `useScreenSecurity`, `useScreenshotDetection`, `enableFullProtection`, `disableFullProtection`
- Typed `BlurStyle` export
- Autolinking support for iOS and Android
