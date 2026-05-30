#import <React/RCTEventEmitter.h>

#ifdef RCT_NEW_ARCH_ENABLED
#import <RTNScreenSecuritySpec/RTNScreenSecuritySpec.h>

@interface RTNScreenSecurity : RCTEventEmitter <NativeScreenSecuritySpec>
@end

#else
#import <React/RCTBridgeModule.h>

@interface RTNScreenSecurity : RCTEventEmitter <RCTBridgeModule>
@end

#endif
