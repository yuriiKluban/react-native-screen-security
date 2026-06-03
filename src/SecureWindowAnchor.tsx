import React from 'react';
import { Platform, StyleSheet, type ViewProps } from 'react-native';

import SecureWindowAnchorNative from './SecureWindowAnchorNativeComponent';

const anchorStyles = StyleSheet.create({
  anchor: {
    position: 'absolute',
    width: 0,
    height: 0,
    opacity: 0,
  },
});

/**
 * Android-only invisible anchor that binds FLAG_SECURE to the hosting
 * native Fragment (react-native-screens). Used internally by SecureView.
 * Place at the screen root only when you need fragment-scoped protection
 * without wrapping content in SecureView.
 */
export const SecureWindowAnchor = (props: ViewProps) => {
  if (Platform.OS !== 'android') {
    return null;
  }

  return (
    <SecureWindowAnchorNative
      {...props}
      collapsable={false}
      pointerEvents="none"
      style={[anchorStyles.anchor, props.style]}
    />
  );
};
