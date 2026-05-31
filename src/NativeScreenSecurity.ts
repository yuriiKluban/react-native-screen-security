import { TurboModule, TurboModuleRegistry } from 'react-native';

export type BlurStyleEnum = 'light' | 'dark' | 'system' | 'extraLight';

export interface Spec extends TurboModule {
  setSecureWindow(enable: boolean): void;
  setAppSwitcherBlur(enable: boolean, style: BlurStyleEnum): void;
  addListener(eventName: string): void;
  removeListeners(count: number): void;
}

export default TurboModuleRegistry.getEnforcing<Spec>('RTNScreenSecurity');
