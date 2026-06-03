#ifdef RCT_NEW_ARCH_ENABLED

#import "RTNSecureView.h"
#if __has_include(<react_native_screen_security/react_native_screen_security-Swift.h>)
#import <react_native_screen_security/react_native_screen_security-Swift.h>
#else
#import "react_native_screen_security-Swift.h"
#endif

#import <react/renderer/components/RTNScreenSecuritySpec/ComponentDescriptors.h>
#import <react/renderer/components/RTNScreenSecuritySpec/EventEmitters.h>
#import <react/renderer/components/RTNScreenSecuritySpec/Props.h>

using namespace facebook::react;

@implementation RTNSecureView {
    UITextField *_secureTextField;
    UIView *_secureContainer;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
    return concreteComponentDescriptorProvider<SecureViewComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame
{
    self = [super initWithFrame:frame];
    if (self) {
        static const auto defaultProps = std::make_shared<const SecureViewProps>();
        _props = defaultProps;

        [self _setupSecureContainer];
    }
    return self;
}

#pragma mark - Secure Container Setup

- (void)_setupSecureContainer
{
    UITextField *field = [SecureCanvasFactory makeSecureTextFieldWithFrame:self.bounds];
    [self addSubview:field];
    [field layoutIfNeeded];

    UIView *canvas = [SecureCanvasFactory canvasViewFrom:field];
    if (canvas) {
        canvas.userInteractionEnabled = YES;
        canvas.backgroundColor = [UIColor clearColor];
        canvas.frame = field.bounds;
        canvas.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
    }

    _secureTextField = field;
    _secureContainer = canvas;
}

#pragma mark - Layout

- (void)layoutSubviews
{
    [super layoutSubviews];
    _secureTextField.frame = self.bounds;
    _secureContainer.frame = _secureTextField.bounds;
}

#pragma mark - Fabric Child Mounting

- (void)mountChildComponentView:(UIView<RCTComponentViewProtocol> *)childComponentView
                          index:(NSInteger)index
{
    if (_secureContainer) {
        if (index >= (NSInteger)_secureContainer.subviews.count) {
            [_secureContainer addSubview:childComponentView];
        } else {
            [_secureContainer insertSubview:childComponentView atIndex:index];
        }
    } else {
        [super mountChildComponentView:childComponentView index:index];
    }
}

- (void)unmountChildComponentView:(UIView<RCTComponentViewProtocol> *)childComponentView
                            index:(NSInteger)index
{
    [childComponentView removeFromSuperview];
}

#pragma mark - Touch Passthrough

- (UIView *)hitTest:(CGPoint)point withEvent:(UIEvent *)event
{
    if (!self.userInteractionEnabled || self.hidden || self.alpha <= 0.01) {
        return nil;
    }

    if (![self pointInside:point withEvent:event]) {
        return nil;
    }

    if (_secureContainer) {
        CGPoint containerPoint = [_secureContainer convertPoint:point fromView:self];
        NSArray<UIView *> *children = _secureContainer.subviews;
        for (NSInteger i = children.count - 1; i >= 0; i--) {
            UIView *child = children[i];
            CGPoint childPoint = [child convertPoint:containerPoint fromView:_secureContainer];
            UIView *hitView = [child hitTest:childPoint withEvent:event];
            if (hitView) {
                return hitView;
            }
        }
    }

    return self;
}

@end

#endif
