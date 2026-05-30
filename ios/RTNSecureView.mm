#ifdef RCT_NEW_ARCH_ENABLED

#import "RTNSecureView.h"

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
    UITextField *field = [[UITextField alloc] initWithFrame:self.bounds];

    // GPU-level protection: the internal canvas layer is blanked during capture
    field.secureTextEntry = YES;

    // Mitigation #3 — prevent keyboard trigger
    field.enabled = NO;

    // Mitigation #1 — prevent touch interception by the text field
    field.userInteractionEnabled = NO;

    // Mitigation #4 — prevent visual artifacts (white bg, borders)
    field.backgroundColor = [UIColor clearColor];
    field.borderStyle = UITextBorderStyleNone;
    field.textColor = [UIColor clearColor];
    field.tintColor = [UIColor clearColor];
    field.opaque = NO;

    field.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;

    [self addSubview:field];
    [field layoutIfNeeded];

    // Extract the GPU-protected canvas (_UITextFieldCanvasView)
    UIView *canvas = field.subviews.firstObject;
    if (canvas) {
        canvas.userInteractionEnabled = YES;
        canvas.backgroundColor = [UIColor clearColor];
        canvas.frame = field.bounds;
        canvas.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
    }

    _secureTextField = field;
    _secureContainer = canvas;
}

#pragma mark - Layout (Mitigation #2)

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

#pragma mark - Touch Passthrough (Mitigation #1)

- (UIView *)hitTest:(CGPoint)point withEvent:(UIEvent *)event
{
    if (!self.userInteractionEnabled || self.hidden || self.alpha <= 0.01) {
        return nil;
    }

    if (![self pointInside:point withEvent:event]) {
        return nil;
    }

    // Bypass the disabled UITextField — route touches directly to RN children
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
