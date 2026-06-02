import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import {
  Button,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { enableScreens } from 'react-native-screens';
import {
  BlurStyle,
  SecureView,
  disableFullProtection,
  enableFullProtection,
  getSecurityState,
  setAppSwitcherBlur,
  useScreenRecordingDetection,
  useScreenSecurity,
  useScreenshotDetection,
} from 'react-native-screen-security';

enableScreens();

type RootStackParamList = {
  Home: undefined;
  TabsDemo: undefined;
  GlobalProtection: undefined;
  ComponentProtection: undefined;
  Detection: undefined;
  BlurPicker: undefined;
  ToggleDemo: undefined;
  Imperative: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: '#1a365d',
    borderRadius: 12,
    padding: 20,
    marginVertical: 12,
  },
  pan: { color: '#f6e05e', fontSize: 18, letterSpacing: 2, fontFamily: 'monospace' },
  label: { color: '#90cdf4', fontSize: 12, marginBottom: 8 },
});

function CreditCardWidget() {
  return (
    <View style={cardStyles.card}>
      <Text style={cardStyles.label}>Sensitive (wrapped in SecureView)</Text>
      <Text style={cardStyles.pan}>4111 1111 1111 4242</Text>
      <Text style={{ color: '#bee3f8', marginTop: 8 }}>Exp 12/28 · CVV ***</Text>
    </View>
  );
}

function ScreenShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <Text style={styles.screenTitle}>{title}</Text>
      <ScrollView contentContainerStyle={styles.scrollContent}>{children}</ScrollView>
    </SafeAreaView>
  );
}

function HomeScreen({ navigation }: { navigation: { navigate: (s: keyof RootStackParamList) => void } }) {
  const items: { label: string; route: keyof RootStackParamList }[] = [
    { label: 'Tab navigator (fragment-scoped)', route: 'TabsDemo' },
    { label: 'Global protection (useScreenSecurity)', route: 'GlobalProtection' },
    { label: 'Component SecureView', route: 'ComponentProtection' },
    { label: 'Screenshot / recording detection', route: 'Detection' },
    { label: 'App-switcher blur styles', route: 'BlurPicker' },
    { label: 'enabled: false toggles', route: 'ToggleDemo' },
    { label: 'Imperative enable / disable', route: 'Imperative' },
  ];

  return (
    <ScreenShell title="react-native-screen-security">
      <Text style={styles.hint}>
        Try screenshots, screen recording, and the app switcher on each screen.
      </Text>
      {items.map(item => (
        <Pressable
          key={item.route}
          style={styles.menuRow}
          onPress={() => navigation.navigate(item.route)}
        >
          <Text style={styles.menuText}>{item.label}</Text>
        </Pressable>
      ))}
      <StateFooter />
    </ScreenShell>
  );
}

function StateFooter() {
  const [state, setState] = useState(() => getSecurityState());
  return (
    <View style={styles.stateBox}>
      <Text style={styles.stateTitle}>getSecurityState()</Text>
      <Text style={styles.mono}>
        secureWindowActive: {String(state.secureWindowActive)} · appSwitcherBlurActive:{' '}
        {String(state.appSwitcherBlurActive)}
      </Text>
      <Button title="Refresh state" onPress={() => setState(getSecurityState())} />
    </View>
  );
}

function TabsDemoScreen() {
  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <Text style={styles.screenTitle}>Tabs — Tab 2 is secured</Text>
      <Tab.Navigator screenOptions={{ headerShown: false }}>
        <Tab.Screen name="Public" component={PublicTab} />
        <Tab.Screen name="Secured" component={SecuredTab} />
      </Tab.Navigator>
    </SafeAreaView>
  );
}

function PublicTab() {
  return (
    <View style={styles.tabBody}>
      <Text style={styles.body}>No SecureView — screenshots allowed on Android.</Text>
      <CreditCardWidget />
    </View>
  );
}

function SecuredTab() {
  useScreenSecurity({ protectionLevel: 'component' });
  return (
    <SecureView fill style={styles.tabBody}>
      <Text style={styles.body}>
        SecureView + component hook. Switch to Public tab to clear FLAG_SECURE on Android.
      </Text>
      <CreditCardWidget />
    </SecureView>
  );
}

function GlobalProtectionScreen() {
  useScreenSecurity({ protectionLevel: 'global', blur: true, blurStyle: 'dark' });
  return (
    <ScreenShell title="Global protection">
      <Text style={styles.body}>
        useScreenSecurity({'{ protectionLevel: "global" }'}) — entire window is protected.
      </Text>
      <CreditCardWidget />
      <StateFooter />
    </ScreenShell>
  );
}

function ComponentProtectionScreen() {
  useScreenSecurity({ protectionLevel: 'component', blur: true });
  return (
    <ScreenShell title="Component SecureView">
      <Text style={styles.body}>Only the card below is inside SecureView.</Text>
      <View style={[cardStyles.card, { backgroundColor: '#2d3748' }]}>
        <Text style={styles.body}>Public chrome — not blanked on iOS component mode.</Text>
      </View>
      <SecureView>
        <CreditCardWidget />
      </SecureView>
      <StateFooter />
    </ScreenShell>
  );
}

function DetectionScreen() {
  const [shots, setShots] = useState(0);
  const [recording, setRecording] = useState(false);

  useScreenshotDetection(useCallback(() => setShots(n => n + 1), []));
  useScreenRecordingDetection(useCallback(e => setRecording(e.isCaptured), []));

  return (
    <ScreenShell title="Detection hooks">
      <Text style={styles.body}>Screenshots taken this session: {shots}</Text>
      <Text style={styles.body}>
        Screen recording: {Platform.OS === 'ios' ? (recording ? 'active' : 'inactive') : 'iOS only'}
      </Text>
      <StateFooter />
    </ScreenShell>
  );
}

const BLUR_STYLES: BlurStyle[] = ['light', 'dark', 'system', 'extraLight'];

function BlurPickerScreen() {
  const [style, setStyle] = useState<BlurStyle>('system');
  useScreenSecurity({ protectionLevel: 'global', blur: true, blurStyle: style });

  return (
    <ScreenShell title="App-switcher blur">
      <Text style={styles.body}>
        {Platform.OS === 'ios'
          ? 'Send app to background to preview blur.'
          : 'App-switcher blur is iOS-only; global FLAG_SECURE still applies on Android.'}
      </Text>
      {BLUR_STYLES.map(s => (
        <Pressable
          key={s}
          style={[styles.menuRow, style === s && styles.menuRowActive]}
          onPress={() => {
            setStyle(s);
            if (Platform.OS === 'ios') {
              setAppSwitcherBlur(true, s);
            }
          }}
        >
          <Text style={styles.menuText}>blurStyle: {s}</Text>
        </Pressable>
      ))}
      <StateFooter />
    </ScreenShell>
  );
}

function ToggleDemoScreen() {
  const [hookOn, setHookOn] = useState(true);
  const [viewOn, setViewOn] = useState(true);
  useScreenSecurity({ protectionLevel: 'global', enabled: hookOn });

  return (
    <ScreenShell title="enabled toggles">
      <Button title={`Hook enabled: ${hookOn}`} onPress={() => setHookOn(v => !v)} />
      <Button title={`SecureView enabled: ${viewOn}`} onPress={() => setViewOn(v => !v)} />
      <SecureView enabled={viewOn}>
        <CreditCardWidget />
      </SecureView>
      <StateFooter />
    </ScreenShell>
  );
}

function ImperativeScreen() {
  return (
    <ScreenShell title="Imperative API">
      <Button title="enableFullProtection()" onPress={() => enableFullProtection('system')} />
      <Button title="disableFullProtection()" onPress={() => disableFullProtection()} />
      <CreditCardWidget />
      <StateFooter />
    </ScreenShell>
  );
}

function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" />
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerStyle: { backgroundColor: '#1a202c' },
            headerTintColor: '#fff',
            contentStyle: { backgroundColor: '#171923' },
          }}
        >
          <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Screen Security' }} />
          <Stack.Screen name="TabsDemo" component={TabsDemoScreen} options={{ title: 'Tabs' }} />
          <Stack.Screen name="GlobalProtection" component={GlobalProtectionScreen} />
          <Stack.Screen name="ComponentProtection" component={ComponentProtectionScreen} />
          <Stack.Screen name="Detection" component={DetectionScreen} />
          <Stack.Screen name="BlurPicker" component={BlurPickerScreen} />
          <Stack.Screen name="ToggleDemo" component={ToggleDemoScreen} />
          <Stack.Screen name="Imperative" component={ImperativeScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#171923' },
  screenTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  scrollContent: { padding: 16, paddingBottom: 32 },
  hint: { color: '#a0aec0', marginBottom: 16, lineHeight: 20 },
  body: { color: '#e2e8f0', marginBottom: 12, lineHeight: 22 },
  menuRow: {
    backgroundColor: '#2d3748',
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
  },
  menuRowActive: { borderWidth: 2, borderColor: '#63b3ed' },
  menuText: { color: '#fff', fontSize: 16 },
  tabBody: { flex: 1, padding: 16, backgroundColor: '#171923' },
  stateBox: {
    marginTop: 24,
    padding: 12,
    backgroundColor: '#2d3748',
    borderRadius: 8,
  },
  stateTitle: { color: '#90cdf4', marginBottom: 8 },
  mono: { color: '#e2e8f0', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 12 },
});

export default App;
