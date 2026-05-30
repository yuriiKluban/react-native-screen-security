import { TurboModule, TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  setSecureWindow(enable: boolean): void;
  setAppSwitcherBlur(enable: boolean, style: string): void;
  addListener(eventName: string): void;
  removeListeners(count: number): void;
}

export default TurboModuleRegistry.getEnforcing<Spec>('RTNScreenSecurity');
