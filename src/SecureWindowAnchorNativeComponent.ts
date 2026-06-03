import type { HostComponent, ViewProps } from 'react-native';
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface NativeSecureWindowAnchorProps extends ViewProps {}

export default codegenNativeComponent<NativeSecureWindowAnchorProps>(
  'RTNSecureWindowAnchor',
) as HostComponent<NativeSecureWindowAnchorProps>;
