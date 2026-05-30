import React from 'react';
import { Platform, StyleSheet, type View, type ViewProps } from 'react-native';

import SecureViewNativeComponent from './SecureViewNativeComponent';
import SecureWindowAnchorNative from './SecureWindowAnchorNative';

export interface SecureViewProps extends ViewProps {
  children?: React.ReactNode;
}

const styles = StyleSheet.create({
  stretch: { flex: 1 },
});

export const SecureView = React.forwardRef<View, SecureViewProps>(({ children, style, ...props }, ref) => {
  const mergedStyle = [styles.stretch, style];

  if (Platform.OS === 'android') {
    return (
      <SecureWindowAnchorNative ref={ref} style={mergedStyle} collapsable={false} {...props}>
        {children}
      </SecureWindowAnchorNative>
    );
  }

  return (
    <SecureViewNativeComponent ref={ref} style={mergedStyle} collapsable={false} {...props}>
      {children}
    </SecureViewNativeComponent>
  );
});

SecureView.displayName = 'SecureView';
