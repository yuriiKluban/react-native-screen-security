import type { HostComponent, ViewProps } from 'react-native';
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';

export interface NativeSecureWindowAnchorProps extends ViewProps {}

export default codegenNativeComponent<NativeSecureWindowAnchorProps>(
  'RTNSecureWindowAnchor',
) as HostComponent<NativeSecureWindowAnchorProps>;
