/** @type {import('@react-native-community/cli-types').Config} */
module.exports = {
  dependency: {
    platforms: {
      ios: {
        podspecPath: './react-native-screen-security.podspec',
      },
      android: {
        sourceDir: './android',
        packageImportPath:
          'import com.reactnativescreensecurity.ScreenSecurityPackage;',
      },
    },
  },
};
