[![CI](https://github.com/yuriiKluban/react-native-screen-security/actions/workflows/ci.yml/badge.svg)](https://github.com/yuriiKluban/react-native-screen-security/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/react-native-screen-security.svg)](https://www.npmjs.com/package/react-native-screen-security)
[![license](https://img.shields.io/npm/l/react-native-screen-security.svg)](https://github.com/yuriikluban/react-native-screen-security/blob/main/LICENSE)

# react-native-screen-security

High-performance UI security and Data Leakage Prevention (DLP) for React Native **New Architecture** (Fabric & TurboModules). Prevent screenshots, mask sensitive content in the OS App Switcher, and detect screen capture events — with zero Bridge overhead.

## Key Features

- 🚫 **Screen Capture Prevention** — Leverages Android's `FLAG_SECURE` to block screenshots and screen recordings globally or per-screen.
- 👁️ **App Switcher Masking (iOS)** — Protects user privacy by automatically blurring or hiding sensitive views (like credit cards or balances) when the app goes into the background.
- 🔔 **Screenshot Detection** — Provides clean, reactive hooks to notify your app whenever a screenshot is taken.

## Table of contents

- [Features](#features)
- [See it in action](#see-it-in-action)
- [Requirements](#requirements)
- [Installation](#installation)
- [Usage](#usage)
  - [Step 1: Import](#step-1-import)
  - [Step 2: Protect a screen](#step-2-protect-a-screen-recommended)
  - [Step 3: Detect screenshots (optional)](#step-3-detect-screenshots-optional)
  - [Common patterns](#common-patterns)
  - [Imperative API](#imperative-api)
- [API reference](#api-reference)
- [Platform behavior](#platform-behavior)
- [Permissions](#permissions)
- [Testing](#testing)
- [Limitations](#limitations)
- [Troubleshooting](#troubleshooting)
- [License](#license)

## Features

- **Secure window** — blocks screen recording and screenshots
  - **iOS:** secure canvas layer overlay (renders black/blank during capture)
  - **Android:** `FLAG_SECURE` on the current Activity window
- **App switcher blur (iOS)** — blurs the window when the app goes to background
- **SecureView component** — per-region GPU blanking on iOS; fragment-scoped `FLAG_SECURE` on Android (tab-safe)
- **Screenshot detection** — emits `onScreenshotTaken` events to JavaScript
- **Screen recording detection (iOS)** — `useScreenRecordingDetection` hook
- **React hooks** — `useScreenSecurity`, `useScreenshotDetection`
- **Autolinking** — works out of the box with React Native autolinking

## See it in action

### iOS — `SecureView` component masking

Wrap sensitive UI in `<SecureView>` for per-region GPU blanking. The live app stays fully readable; captured screenshots and recordings mask only the protected component.

<p align="center">
  <img src="https://github.com/yuriikluban/react-native-screen-security/raw/main/.github/assets/ios_blur.png" alt="iOS: original app interface (left) vs captured screenshot with SecureView mask on the credit card (right)" width="900" />
</p>

### Android — screenshot & recording blocked (`FLAG_SECURE`)

Window or fragment-scoped `FLAG_SECURE` blocks screenshots and screen recordings. Android shows a system notification when capture is denied.

<p align="center">
  <img src="https://github.com/yuriikluban/react-native-screen-security/raw/main/.github/assets/android_blur.png" alt="Android app showing the system toast: This app doesn't allow screenshots" width="360" />
</p>

### App switcher privacy

When the app enters the background, iOS blurs the window in the task switcher (`setAppSwitcherBlur` / `useScreenSecurity`). Android hides the recents preview while `FLAG_SECURE` is active.

<p align="center">
  <img src="https://github.com/yuriikluban/react-native-screen-security/raw/main/.github/assets/app_switch.png" alt="iOS app switcher with blur overlay vs Android recents with hidden app preview" width="900" />
</p>

## Requirements

|              | Version                                   |
| ------------ | ----------------------------------------- |
| React Native | `>= 0.79` (New Architecture required)     |
| iOS          | `>= 13.4`                                 |
| Android      | `minSdk 24`, `compileSdk 34+` recommended |
| React        | `>= 18`                                   |

> **Android tab navigation:** component-level protection requires `<SecureView>` (or native fragment host via react-native-screens). The hook alone enables iOS app-switcher blur but does not apply `FLAG_SECURE` on Android in `component` mode.

## Installation

```bash
yarn add react-native-screen-security
# or
npm install react-native-screen-security
```

**iOS** — install pods and rebuild:

```bash
cd ios && pod install && cd ..
yarn ios
```

**Android** — rebuild (autolinking handles the rest):

```bash
yarn android
```

> Metro hot reload is **not** enough after installing a native module. You must rebuild the app.

### Local / monorepo setup

**Yarn workspace (this repo):**

```json
{
  "workspaces": { "packages": ["example"] },
  "dependencies": {
    "react-native-screen-security": "*"
  }
}
```

From the repo root: `yarn install` → `yarn workspace screen-security-example pods` (iOS) → `yarn workspace screen-security-example ios` / `android`.

**File dependency in another app:**

```json
{
  "dependencies": {
    "react-native-screen-security": "file:../react-native-screen-security"
  }
}
```

Then: `yarn install` → `cd ios && pod install` → rebuild.

> **TypeScript in monorepos:** the published `types` field points at `lib/index.d.ts`, which is generated and gitignored. After cloning, run `yarn build` at the library root, or map the example app to source (see `example/tsconfig.json` `paths`). Metro already bundles `src/index.ts` via the package `"react-native"` field.

### Example app

The [`example/`](example/) app exercises every API (tabs, global/component protection, detection, blur, toggles, imperative calls, `getSecurityState`). Use it for manual QA when changing native code.

---

## Choosing an API

Use this decision tree to pick the right integration:

| Your goal                                              | Use                                                                                 |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| Protect one screen in a tab navigator (Android)        | `<SecureView>` (or `<SecureWindowAnchor />` at screen root)                         |
| GPU-blank a region on iOS + app-switcher blur          | `useScreenSecurity()` + `<SecureView>` around sensitive content                     |
| Protect the entire app after login                     | `useScreenSecurity({ protectionLevel: 'global' })` at app root                      |
| Fragment-scoped Android protection without wrapping UI | `<SecureWindowAnchor />`                                                            |
| Toggle protection from settings                        | `useScreenSecurity({ enabled: isOn })` or imperative API (see ref-count note below) |

**Android tabs:** component-level protection works best with [`react-native-screens`](https://github.com/software-mansion/react-native-screens) native fragments. The library binds `FLAG_SECURE` to Fragment resume/pause — no hard peer dependency, but tabs without native screen fragments may not behave correctly.

### Ref-count semantics

`setSecureWindow(true)` and `setSecureWindow(false)` are **+1 / −1 deltas**, not absolute on/off toggles. The same applies to `enableFullProtection()` / `disableFullProtection()` and `useScreenSecurity({ protectionLevel: 'global' })`.

- Mount two global hooks → native ref count is 2; unmounting one leaves protection active.
- Call `enableFullProtection()` twice → call `disableFullProtection()` twice to fully release.

On iOS, `setAppSwitcherBlur` is also ref-counted. When multiple hooks enable blur with different `blurStyle` values, the **last caller's style** applies while the ref count stays above zero.

---

## Usage

### Step 1: Import

```ts
import {
  useScreenSecurity,
  useScreenshotDetection,
  useScreenRecordingDetection,
  SecureView,
  SecureWindowAnchor,
  onScreenRecordingStatusChanged,
  enableFullProtection,
  disableFullProtection,
} from 'react-native-screen-security';
```

### Step 2: Protect a screen (recommended)

Use `useScreenSecurity()` for iOS app-switcher blur and wrap sensitive content in `<SecureView>`.

On **Android**, `SecureView` binds `FLAG_SECURE` to the native Fragment lifecycle (works correctly with tab navigators). On **iOS**, `SecureView` GPU-blanks only the wrapped region during capture.

```tsx
import React from 'react';
import { Text } from 'react-native';
import { useScreenSecurity, SecureView } from 'react-native-screen-security';

export function PaymentDetailsScreen() {
  useScreenSecurity();

  return (
    <SecureView style={{ flex: 1 }}>
      <Text>Card number: •••• •••• •••• 4242</Text>
    </SecureView>
  );
}
```

**App-wide protection (both platforms):**

```tsx
useScreenSecurity({ protectionLevel: 'global' });
```

**With blur style (iOS app switcher):**

```tsx
useScreenSecurity({ blur: true, blurStyle: 'dark' });
// blurStyle options: 'light' | 'dark' | 'system' | 'extraLight' (default: 'system')
```

See [App switcher privacy](#app-switcher-privacy) for a visual preview on iOS and Android.

**Secure window only (no app switcher blur on iOS):**

```tsx
useScreenSecurity({ blur: false });
```

### Step 3: Detect screenshots (optional)

React to screenshot attempts — show a warning, log analytics, invalidate a session, etc.

```tsx
import React from 'react';
import { Alert } from 'react-native';
import { useScreenSecurity, useScreenshotDetection } from 'react-native-screen-security';

export function ConfidentialDocumentScreen() {
  useScreenSecurity();

  useScreenshotDetection(() => {
    Alert.alert('Screenshot blocked', 'Screenshots are not allowed on this screen.');
  });

  return (
    <SecureView style={{ flex: 1 }}>
      <DocumentViewer />
    </SecureView>
  );
}
```

### Step 4: Detect screen recording (iOS, optional)

```tsx
import { useScreenRecordingDetection } from 'react-native-screen-security';

useScreenRecordingDetection(({ isCaptured }) => {
  console.log('Screen recording:', isCaptured ? 'started' : 'stopped');
});
```

---

### Common patterns

#### Pattern 1: Protect specific screens in a navigator

```tsx
// screens/BankAccountScreen.tsx
import { useScreenSecurity, SecureView } from 'react-native-screen-security';

export function BankAccountScreen() {
  useScreenSecurity();
  return (
    <SecureView style={{ flex: 1 }}>
      <AccountDetails />
    </SecureView>
  );
}

// screens/SettingsScreen.tsx — no hook, screen is not protected
export function SettingsScreen() {
  return <SettingsList />;
}
```

#### Pattern 2: Protect the entire app after login

```tsx
// App.tsx or AuthenticatedNavigator.tsx
import { useEffect } from 'react';
import { enableFullProtection, disableFullProtection } from 'react-native-screen-security';

export function AuthenticatedApp() {
  useEffect(() => {
    enableFullProtection('system');

    return () => disableFullProtection();
  }, []);

  return <MainNavigator />;
}
```

#### Pattern 3: Toggle protection from app settings

```tsx
import { useEffect } from 'react';
import { enableFullProtection, disableFullProtection } from 'react-native-screen-security';

function AppRoot() {
  const isSecurityEnabled = useAppSelector(state => state.settings.screenSecurity);

  useEffect(() => {
    if (isSecurityEnabled) {
      enableFullProtection('system');
    } else {
      disableFullProtection();
    }
  }, [isSecurityEnabled]);

  return <Navigator />;
}
```

#### Pattern 4: Screenshot detection with analytics

```tsx
import { useScreenSecurity, useScreenshotDetection } from 'react-native-screen-security';

function PiiScreen() {
  useScreenSecurity();

  useScreenshotDetection(() => {
    analytics.track('screenshot_taken', { screen: 'pii_details' });
  });

  return <PiiForm />;
}
```

#### Pattern 5: Manual subscription (outside React components)

```ts
import { onScreenshotTaken } from 'react-native-screen-security';

// In a service or singleton
const subscription = onScreenshotTaken(() => {
  securityService.handleScreenshot();
});

// When done:
subscription.remove();
```

---

### Imperative API

Use these when you need control outside of React hooks (services, Redux middleware, auth flows).

```ts
import {
  setSecureWindow,
  setAppSwitcherBlur,
  enableFullProtection,
  disableFullProtection,
  getSecurityState,
  acquireSecureWindow,
  onScreenshotTaken,
} from 'react-native-screen-security';

// Turn on everything (secure window + iOS app switcher blur)
enableFullProtection('system');

// Turn off everything
disableFullProtection();

// Granular control
setSecureWindow(true); // block capture/screenshots
setAppSwitcherBlur(true, 'dark'); // iOS only — blur in app switcher
setSecureWindow(false);
setAppSwitcherBlur(false, 'system');

// Sync native ref-count state (debug / settings UI)
const { secureWindowActive, appSwitcherBlurActive } = getSecurityState();

// Token-style release (services, navigation guards)
const token = acquireSecureWindow();
token.release();
```

| Function                          | When to use                                                   |
| --------------------------------- | ------------------------------------------------------------- |
| `useScreenSecurity()`             | Per screen — iOS blur; use with `<SecureView>` on Android     |
| `SecureView`                      | Wrap sensitive UI — required for Android component protection |
| `enableFullProtection()`          | App-wide — call in `useEffect` or after auth                  |
| `setSecureWindow(true/false)`     | Fine-grained global window control                            |
| `getSecurityState()`              | Read whether secure window / app-switcher blur refs are active |
| `acquireSecureWindow()`           | Imperative global protection with `release()`                 |
| `acquireAppSwitcherBlur()`        | iOS app-switcher blur with `release()`                        |
| `useScreenshotDetection(cb)`      | React component — react to screenshots                        |
| `useScreenRecordingDetection(cb)` | iOS only — screen recording status                            |
| `onScreenshotTaken(cb)`           | Non-React code — returns subscription to `.remove()`          |

---

## API reference

### Hooks

#### `useScreenSecurity(options?)`

| Option            | Type                      | Default       | Description                                               |
| ----------------- | ------------------------- | ------------- | --------------------------------------------------------- |
| `protectionLevel` | `'component' \| 'global'` | `'component'` | `global` applies window-wide protection on both platforms |
| `blur`            | `boolean`                 | `true`        | Enable app switcher blur on iOS                           |
| `blurStyle`       | `BlurStyle`               | `'system'`    | `'light'`, `'dark'`, `'system'`, or `'extraLight'`        |
| `enabled`         | `boolean`                 | `true`        | When `false`, the hook is a no-op                         |

#### `useScreenshotDetection(callback: () => void)`

Subscribes to `onScreenshotTaken`. Safe to pass inline callbacks — uses a stable ref internally.

#### `useScreenRecordingDetection(callback: (event: { isCaptured: boolean }) => void)`

Subscribes to `onScreenRecordingStatusChanged`. **iOS only.**

#### `SecureView`

Cross-platform container for sensitive content. Required on Android for component-level `FLAG_SECURE` (including tab navigators). On iOS, only wrapped regions are GPU-blanked during capture — see [See it in action](#see-it-in-action).

| Prop      | Type      | Default | Description                                                         |
| --------- | --------- | ------- | ------------------------------------------------------------------- |
| `fill`    | `boolean` | `false` | When `true`, applies `flex: 1` (pre-1.1.0 / 1.0.x default behavior) |
| `enabled` | `boolean` | `true`  | When `false`, renders a plain `View` without native protection      |

Does not apply `flex: 1` by default — pass `fill` or `style={{ flex: 1 }}` for full-screen wrappers.

#### `SecureWindowAnchor`

Android-only invisible anchor that binds `FLAG_SECURE` to the hosting native Fragment. Use at the screen root when you need fragment-scoped protection without wrapping content in `SecureView`. Renders `null` on iOS.

### Functions

| Function                         | Signature                                                                     | Description                               |
| -------------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------- |
| `setSecureWindow`                | `(enable: boolean) => void`                                                   | Ref-count +1/−1 for global secure window  |
| `setAppSwitcherBlur`             | `(enable: boolean, style?: BlurStyle) => void`                                | Ref-count +1/−1 for iOS app switcher blur |
| `getSecurityState`               | `() => SecurityState`                                                         | Sync snapshot of native ref-count flags   |
| `acquireSecureWindow`            | `() => SecurityToken`                                                         | Enable global window; call `release()`    |
| `acquireAppSwitcherBlur`         | `(style?: BlurStyle) => SecurityToken`                                        | iOS blur token with `release()`           |
| `enableFullProtection`           | `(blurStyle?: BlurStyle) => void`                                             | Secure window + iOS blur                  |
| `disableFullProtection`          | `() => void`                                                                  | Disable all protection                    |
| `onScreenshotTaken`              | `(callback: () => void) => EmitterSubscription`                               | Subscribe to screenshot events            |
| `onScreenRecordingStatusChanged` | `(callback: (event: { isCaptured: boolean }) => void) => EmitterSubscription` | Subscribe to recording status (iOS only)  |

### Types

```ts
type BlurStyle = 'light' | 'dark' | 'system' | 'extraLight';
type ProtectionLevel = 'component' | 'global';

type ScreenRecordingEvent = { isCaptured: boolean };
type ScreenshotEvent = Record<string, never>;

type SecurityState = {
  secureWindowActive: boolean;
  appSwitcherBlurActive: boolean;
};

type SecurityToken = { release: () => void };

interface ScreenSecurityOptions {
  protectionLevel?: ProtectionLevel;
  blur?: boolean;
  blurStyle?: BlurStyle;
  enabled?: boolean;
}
```

### Events

| Event                            | Payload                   | When fired                                       | Platforms    |
| -------------------------------- | ------------------------- | ------------------------------------------------ | ------------ |
| `onScreenshotTaken`              | `{}`                      | User takes a screenshot or screen capture starts | iOS, Android |
| `onScreenRecordingStatusChanged` | `{ isCaptured: boolean }` | Screen recording starts or stops                 | iOS only     |

---

## Platform behavior

| Feature                                            | iOS                                               | Android                                                                                         |
| -------------------------------------------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `SecureView` + `component` mode                    | GPU-blanks wrapped content during capture         | `FLAG_SECURE` while hosting Fragment is resumed (tab-safe)                                      |
| `useScreenSecurity({ protectionLevel: 'global' })` | Window secure layer + optional blur (ref-counted) | Window `FLAG_SECURE` (ref-counted)                                                              |
| `setSecureWindow(true)`                            | Content renders black during recording/capture    | Blocks screenshots, recording, and recents preview — see [See it in action](#see-it-in-action)  |
| `setAppSwitcherBlur`                               | Blur overlay in app switcher                      | No-op (`FLAG_SECURE` already masks recents) — see [App switcher privacy](#app-switcher-privacy) |
| Screenshot detection                               | `userDidTakeScreenshot` + screen capture          | `ScreenCaptureCallback` (API 34+) or `ContentObserver` fallback                                 |
| Screen recording detection                         | `UIScreen.capturedDidChangeNotification`          | Not available                                                                                   |

---

## Permissions

**iOS** — no additional permissions required.

**Android** — `FLAG_SECURE` works without any permission. Screenshot detection on API < 34 may benefit from `READ_MEDIA_IMAGES` (API 33+) or `READ_EXTERNAL_STORAGE` (API < 33). API 34+ uses `ScreenCaptureCallback` and needs no storage permission.

---

## Testing

### Library unit tests

```bash
yarn test
```

Hook ref-count behavior and event payloads are covered with a mocked native module (no device required).

### Example app (manual)

```bash
yarn install
yarn workspace screen-security-example pods   # iOS, first time / native dep changes
yarn workspace screen-security-example ios    # or android
```

### Manual device testing

| Feature                | iOS Simulator | iOS Device | Android Emulator |
| ---------------------- | :-----------: | :--------: | :--------------: |
| App switcher blur      |      Yes      |    Yes     |       N/A        |
| Secure window blocking |      No       |    Yes     |       Yes        |
| Screenshot detection   |      No       |    Yes     |  Yes (API 34+)   |

**iOS:** use a real device for secure window and screenshot tests.

**Android:** use an API 34+ emulator image. Trigger screenshot via ADB:

```bash
adb shell input keyevent 120
```

---

## Limitations

- **Android component mode** requires `<SecureView>` in the tree — `useScreenSecurity()` alone does not apply `FLAG_SECURE`.
- **Android `FLAG_SECURE` is window-wide** while a secured Fragment is active — not pixel-level regions.
- **iOS secure layer** uses a private `UITextField` canvas view — test on new iOS versions before release.
- **Android screenshot detection** on API < 34 is heuristic-based; some OEMs may not be detected.
- **`setSecureWindow` on Android** requires an active Activity — queued automatically if called too early.
- **iOS screenshot events** still fire even when the screenshot appears blank — expected for audit/logging.

## Troubleshooting

**`FLAG_SECURE` stays on when switching tabs (Android)** — ensure sensitive screens use `<SecureView>` and non-sensitive tabs do not. Protection follows Fragment resume/pause, not React unmount.

**`setSecureWindow` has no effect on Android** — ensure the app is in the foreground. The module queues the request if called before Activity is ready.

**Screenshot events not firing on iOS Simulator** — not supported. Use a real device.

**Events not received** — subscribe before taking a screenshot. The native observer starts when the first listener is added.

## Migration

### 1.2.0 → 1.2.1

- **iOS New Architecture:** fixes a launch crash when the library was linked with Fabric enabled (missing `RTNSecureWindowAnchorView`). Upgrade if you saw `RCTThirdPartyComponentsProvider` / `NSClassFromString` failures at startup. No API changes.

### 1.1.x → 1.2.0

- **Default export removed** — use named imports only, e.g. `import { enableFullProtection } from 'react-native-screen-security'`
- **New (optional):** `getSecurityState()`, `acquireSecureWindow()`, `acquireAppSwitcherBlur()`
- Monorepo consumers: run `yarn build` at the library root after clone so `lib/index.d.ts` exists, or point TypeScript at `src/index.ts` (see `example/tsconfig.json`)

### 1.0.x → 1.1.0

- `useScreenRecordingDetection` callback now receives `{ isCaptured: boolean }` instead of a bare boolean
- `<SecureView>` no longer defaults to `flex: 1` — add `style={{ flex: 1 }}` or use `<SecureView fill>`
- Optional: `<SecureView enabled={false}>` to conditionally disable a region without unmounting

## License

MIT — see [LICENSE](LICENSE).
