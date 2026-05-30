[![CI](https://github.com/yuriiKluban/react-native-screen-security/actions/workflows/ci.yml/badge.flow.svg)](https://github.com/yuriiKluban/react-native-screen-security/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/react-native-screen-security.svg)](https://www.npmjs.com/)
[![license](https://img.shields.io/npm/l/react-native-screen-security.svg)](https://github.com/yuriikluban/react-native-screen-security/blob/main/LICENSE)

# react-native-screen-security

High-performance UI security and Data Leakage Prevention (DLP) for React Native **New Architecture** (Fabric & TurboModules). Prevent screenshots, mask sensitive content in the OS App Switcher, and detect screen capture events — with zero Bridge overhead.

## Key Features
* 🚫 **Screen Capture Prevention** — Leverages Android's `FLAG_SECURE` to block screenshots and screen recordings globally or per-screen.
* 👁️ **App Switcher Masking (iOS)** — Protects user privacy by automatically blurring or hiding sensitive views (like credit cards or balances) when the app goes into the background.
* 🔔 **Screenshot Detection** — Provides clean, reactive hooks to notify your app whenever a screenshot is taken.

## Table of contents

- [Features](#features)
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

```json
{
  "dependencies": {
    "react-native-screen-security": "file:./modules/react-native-screen-security"
  }
}
```

Then: `yarn install` → `cd ios && pod install` → rebuild.

---

## Usage

### Step 1: Import

```ts
import {
  useScreenSecurity,
  useScreenshotDetection,
  useScreenRecordingDetection,
  SecureView,
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
// blurStyle options: 'light' | 'dark' | 'system' (default)
```

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

useScreenRecordingDetection(isCaptured => {
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
```

| Function                          | When to use                                                   |
| --------------------------------- | ------------------------------------------------------------- |
| `useScreenSecurity()`             | Per screen — iOS blur; use with `<SecureView>` on Android     |
| `SecureView`                      | Wrap sensitive UI — required for Android component protection |
| `enableFullProtection()`          | App-wide — call in `useEffect` or after auth                  |
| `setSecureWindow(true/false)`     | Fine-grained global window control                            |
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
| `blurStyle`       | `BlurStyle`               | `'system'`    | `'light'`, `'dark'`, or `'system'`                        |

#### `useScreenshotDetection(callback: () => void)`

Subscribes to `onScreenshotTaken`. Safe to pass inline callbacks — uses a stable ref internally.

#### `useScreenRecordingDetection(callback: (event: { isCaptured: boolean }) => void)`

Subscribes to `onScreenRecordingStatusChanged`. **iOS only.**

#### `SecureView`

Cross-platform container for sensitive content. Required on Android for component-level `FLAG_SECURE` (including tab navigators).

### Functions

| Function                | Signature                                       | Description                    |
| ----------------------- | ----------------------------------------------- | ------------------------------ |
| `setSecureWindow`       | `(enable: boolean) => void`                     | Toggle secure window           |
| `setAppSwitcherBlur`    | `(enable: boolean, style?: BlurStyle) => void`  | Toggle iOS app switcher blur   |
| `enableFullProtection`  | `(blurStyle?: BlurStyle) => void`               | Secure window + iOS blur       |
| `disableFullProtection` | `() => void`                                    | Disable all protection         |
| `onScreenshotTaken`     | `(callback: () => void) => EmitterSubscription` | Subscribe to screenshot events |

### Types

```ts
type BlurStyle = 'light' | 'dark' | 'system';
type ProtectionLevel = 'component' | 'global';

interface ScreenSecurityOptions {
  protectionLevel?: ProtectionLevel;
  blur?: boolean;
  blurStyle?: BlurStyle;
}
```

### Events

| Event                            | Payload                   | When fired                                       | Platforms    |
| -------------------------------- | ------------------------- | ------------------------------------------------ | ------------ |
| `onScreenshotTaken`              | `{}`                      | User takes a screenshot or screen capture starts | iOS, Android |
| `onScreenRecordingStatusChanged` | `{ isCaptured: boolean }` | Screen recording starts or stops                 | iOS only     |

---

## Platform behavior

| Feature                                            | iOS                                            | Android                                                         |
| -------------------------------------------------- | ---------------------------------------------- | --------------------------------------------------------------- |
| `SecureView` + `component` mode                    | GPU-blanks wrapped content during capture      | `FLAG_SECURE` while hosting Fragment is resumed (tab-safe)      |
| `useScreenSecurity({ protectionLevel: 'global' })` | Window secure layer + optional blur            | Window `FLAG_SECURE` (ref-counted)                              |
| `setSecureWindow(true)`                            | Content renders black during recording/capture | Blocks screenshots, recording, and recents preview              |
| `setAppSwitcherBlur`                               | Blur overlay in app switcher                   | No-op (`FLAG_SECURE` already masks recents)                     |
| Screenshot detection                               | `userDidTakeScreenshot` + screen capture       | `ScreenCaptureCallback` (API 34+) or `ContentObserver` fallback |
| Screen recording detection                         | `UIScreen.capturedDidChangeNotification`       | Not available                                                   |

---

## Permissions

**iOS** — no additional permissions required.

**Android** — `FLAG_SECURE` works without any permission. Screenshot detection on API < 34 may benefit from `READ_MEDIA_IMAGES` (API 33+) or `READ_EXTERNAL_STORAGE` (API < 33). API 34+ uses `ScreenCaptureCallback` and needs no storage permission.

---

## Testing

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

## License

MIT — see [LICENSE](LICENSE).
