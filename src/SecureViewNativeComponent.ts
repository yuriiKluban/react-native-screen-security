import type { HostComponent, ViewProps } from 'react-native';
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface NativeProps extends ViewProps {}

export default codegenNativeComponent<NativeProps>('SecureView') as HostComponent<NativeProps>;
