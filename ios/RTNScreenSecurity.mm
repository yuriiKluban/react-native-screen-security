#import "RTNScreenSecurity.h"
#if __has_include(<react_native_screen_security/react_native_screen_security-Swift.h>)
#import <react_native_screen_security/react_native_screen_security-Swift.h>
#else
#import "react_native_screen_security-Swift.h"
#endif

@interface RTNScreenSecurity ()
@property (nonatomic, strong) ScreenSecurityManager *manager;
@property (nonatomic, assign) BOOL hasListeners;
@end

@implementation RTNScreenSecurity

RCT_EXPORT_MODULE(RTNScreenSecurity)

- (instancetype)init {
    self = [super init];
    if (self) {
        _manager = [ScreenSecurityManager new];
        _hasListeners = NO;

        UIWindow *hostWindow = [self resolveHostWindow];
        if (hostWindow != nil) {
            [_manager attachToWindow:hostWindow];
        }

        __weak RTNScreenSecurity *weakSelf = self;
        _manager.onScreenshotTaken = ^{
            RTNScreenSecurity *strongSelf = weakSelf;
            if (strongSelf && strongSelf.hasListeners) {
                [strongSelf sendEventWithName:@"onScreenshotTaken" body:@{}];
            }
        };
        _manager.onScreenRecordingStatusChanged = ^(BOOL isCaptured) {
            RTNScreenSecurity *strongSelf = weakSelf;
            if (strongSelf && strongSelf.hasListeners) {
                [strongSelf sendEventWithName:@"onScreenRecordingStatusChanged"
                                         body:@{@"isCaptured": @(isCaptured)}];
            }
        };
    }
    return self;
}

+ (BOOL)requiresMainQueueSetup {
    return YES;
}

- (UIWindow *)resolveHostWindow {
    if (@available(iOS 13.0, *)) {
        for (UIScene *scene in UIApplication.sharedApplication.connectedScenes) {
            if (scene.activationState != UISceneActivationStateForegroundActive) {
                continue;
            }
            if (![scene isKindOfClass:[UIWindowScene class]]) {
                continue;
            }
            UIWindowScene *windowScene = (UIWindowScene *)scene;
            for (UIWindow *window in windowScene.windows) {
                if (window.isKeyWindow) {
                    return window;
                }
            }
        }
    }
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdeprecated-declarations"
    return UIApplication.sharedApplication.keyWindow;
#pragma clang diagnostic pop
}

- (NSArray<NSString *> *)supportedEvents {
    return @[@"onScreenshotTaken", @"onScreenRecordingStatusChanged"];
}

- (void)startObserving {
    self.hasListeners = YES;
    [self.manager startScreenshotObserver];
}

- (void)stopObserving {
    self.hasListeners = NO;
    [self.manager stopScreenshotObserver];
}

// MARK: - TurboModule Methods

RCT_EXPORT_METHOD(setSecureWindow:(BOOL)enable) {
    [self.manager setSecureWindow:enable];
}

RCT_EXPORT_METHOD(setAppSwitcherBlur:(BOOL)enable style:(NSString *)style) {
    [self.manager setAppSwitcherBlur:enable style:style];
}

RCT_EXPORT_SYNCHRONOUS_TYPED_METHOD(NSDictionary *, getSecurityState) {
    return @{
        @"secureWindowActive": @(self.manager.secureWindowActive),
        @"appSwitcherBlurActive": @(self.manager.appSwitcherBlurActive),
    };
}

RCT_EXPORT_METHOD(addListener:(NSString *)eventName) {
    [super addListener:eventName];
}

RCT_EXPORT_METHOD(removeListeners:(double)count) {
    [super removeListeners:count];
}

- (void)invalidate {
    [self.manager invalidate];
    self.hasListeners = NO;
    [super invalidate];
}

#ifdef RCT_NEW_ARCH_ENABLED
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params {
    return std::make_shared<facebook::react::NativeScreenSecuritySpecJSI>(params);
}
#endif

@end
