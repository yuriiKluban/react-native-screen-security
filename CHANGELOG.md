# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.2.0] - 2026-06-03

### Added

- Yarn workspace with `example/` app demonstrating hooks, `SecureView`, tabs, detection, blur styles, and imperative APIs
- `getSecurityState()` — synchronous read of native ref-count state (`secureWindowActive`, `appSwitcherBlurActive`)
- `SecurityState` and `SecurityToken` types
- `acquireSecureWindow()` and `acquireAppSwitcherBlur()` — idempotent release tokens for imperative flows
- `react-native.config.js` for example app autolinking

### Changed

- iOS `ScreenSecurityManager` and Android `SecureWindowController` ref-count / lifecycle hardening
- Lazy `NativeEventEmitter` initialization (created on first subscription)
- One-time `__DEV__` warning for `useScreenRecordingDetection` on Android
- README: monorepo development, example app, new imperative APIs, migration notes for 1.2.0
- Example `tsconfig` paths resolve library types from `src/` during local development

### Removed

- Default export object from the package entry — use named imports (`import { setSecureWindow } from '...'`)

### Fixed

- Secure window anchor / Fabric component codegen file naming (`SecureWindowAnchorNativeComponent`)

## [1.1.1] - 2026-05-31

### Added

- README **See it in action** section with iOS `SecureView` masking, Android screenshot blocking, and app-switcher privacy screenshots
- `.github/assets` included in the published npm package

### Changed

- README images use absolute GitHub raw URLs so they render on npmjs.com and GitHub

## [1.1.0] - 2026-05-31

### Fixed

- iOS ref-counting for global secure window and app-switcher blur — multiple `useScreenSecurity({ protectionLevel: 'global' })` instances no longer disable protection when the first one unmounts
- Babel `build:js` extensions flag — `lib/index.js` now builds correctly on Windows

### Added

- Export `SecureWindowAnchor` for Android fragment-scoped protection without wrapping content
- `enabled?: boolean` option on `useScreenSecurity` (default `true`)
- `SecureView` props: `fill?: boolean` (opt-in `flex: 1`) and `enabled?: boolean` (render plain `View` when `false`)
- `'extraLight'` to `BlurStyle` (maps to iOS `UIBlurEffect.Style.extraLight`)
- `ScreenRecordingEvent` and `ScreenshotEvent` types
- Named export `onScreenRecordingStatusChanged` (was already available; now documented)
- `@platform ios` JSDoc on iOS-only APIs
- `__DEV__` console warning when `useScreenRecordingDetection` is used on Android
- One-time `__DEV__` warning when `useScreenSecurity()` runs in Android component mode without `<SecureView>`
- Jest unit tests with mocked native module (hook ref-count deltas, recording event payload, SecureView props)
- Cross-platform `prepare` script via `rimraf` (Windows-compatible)
- CI verifies `lib/` build artifacts and runs unit tests
- README decision tree, ref-count semantics, migration guide, and `react-native-screens` recommendation

### Changed

- `SecureView` no longer defaults to `flex: 1` — pass `style={{ flex: 1 }}`, or `fill={true}` (1.1.0+), for full-screen wrappers
- `useScreenRecordingDetection` callback now receives `{ isCaptured: boolean }` instead of a bare boolean
- Typed `BlurStyleEnum` in TurboModule codegen spec

## [1.0.3] - 2026-05-30

### Fixed

- Package `main` field and `lib/` NativeComponent babel codegen output

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
- `SecureView` — iOS Fabric GPU-blanked container; Android fragment-scoped `FLAG_SECURE` anchor
- `protectionLevel: 'component' | 'global'` on `useScreenSecurity`
- `useScreenRecordingDetection` hook (iOS only)
- Android `FragmentLifecycleCallbacks` integration for tab-safe `FLAG_SECURE` with react-native-screens

### Changed

- Android component-level protection uses native Fragment lifecycle instead of global ref-count
- Documented peer dependency: React Native `>= 0.79` (New Architecture required)
