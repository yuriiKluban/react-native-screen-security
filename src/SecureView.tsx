import React from 'react';
import { Platform, StyleSheet, View, type ViewProps } from 'react-native';

import SecureViewNativeComponent from './SecureViewNativeComponent';
import SecureWindowAnchorNative from './SecureWindowAnchorNative';

export interface SecureViewProps extends ViewProps {
  children?: React.ReactNode;
  /** When true, applies flex:1 — restores pre-1.1.0 full-screen default. Default false. */
  fill?: boolean;
  /** When false, renders a plain View (no secure native component). Default true. */
  enabled?: boolean;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});

export const SecureView = React.forwardRef<View, SecureViewProps>(
  ({ children, style, fill = false, enabled = true, ...props }, ref) => {
    const mergedStyle = fill ? [styles.fill, style] : style;

    if (!enabled) {
      return (
        <View ref={ref} style={mergedStyle} {...props}>
          {children}
        </View>
      );
    }

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
  },
);

SecureView.displayName = 'SecureView';
