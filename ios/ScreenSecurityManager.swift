import UIKit

@objc public class ScreenSecurityManager: NSObject {

    @objc public var onScreenshotTaken: (() -> Void)?
    @objc public var onScreenRecordingStatusChanged: ((_ isCaptured: Bool) -> Void)?

    private var secureTextField: UITextField?
    private var blurView: UIVisualEffectView?
    private var screenCaptureOverlay: UIVisualEffectView?
    private var screenshotOverlay: UIVisualEffectView?
    private var currentBlurStyle: String = "system"
    private var isBlurEnabled = false
    private var isSecureEnabled = false
    private var screenCaptureObservation: NSObjectProtocol?
    private var screenCaptureProtectionObservation: NSObjectProtocol?
    private var screenshotProtectionObservation: NSObjectProtocol?

    @objc public override init() {
        super.init()
    }

    // MARK: - Public State

    @objc public var secureWindowActive: Bool {
        return isSecureEnabled
    }

    @objc public var appSwitcherBlurActive: Bool {
        return isBlurEnabled
    }

    // MARK: - Secure Window

    @objc public func setSecureWindow(_ enable: Bool) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            guard self.isSecureEnabled != enable else { return }
            self.isSecureEnabled = enable
            if enable {
                self.enableSecureLayer()
                self.startScreenCaptureProtection()
                self.startScreenshotProtection()
            } else {
                self.disableSecureLayer()
                self.stopScreenCaptureProtection()
                self.stopScreenshotProtection()
            }
        }
    }

    private var secureLayer: CALayer?

    private func enableSecureLayer() {
        guard secureTextField == nil else { return }
        guard let window = Self.keyWindow,
              let parentLayer = window.layer.superlayer else { return }

        let field = UITextField()
        field.isSecureTextEntry = true
        field.isUserInteractionEnabled = false
        field.frame = CGRect(x: 0, y: 0, width: 1, height: 1)

        window.addSubview(field)
        field.layoutIfNeeded()
        field.removeFromSuperview()

        guard let containerLayer = field.layer.sublayers?.first else {
            return
        }

        containerLayer.frame = window.bounds
        containerLayer.sublayers?.forEach { $0.frame = window.bounds }

        parentLayer.addSublayer(containerLayer)
        containerLayer.addSublayer(window.layer)

        self.secureTextField = field
        self.secureLayer = containerLayer

        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleBoundsChange),
            name: UIDevice.orientationDidChangeNotification,
            object: nil
        )
    }

    private func disableSecureLayer() {
        NotificationCenter.default.removeObserver(
            self,
            name: UIDevice.orientationDidChangeNotification,
            object: nil
        )

        guard let window = Self.keyWindow,
              let containerLayer = secureLayer,
              let parentLayer = containerLayer.superlayer else {
            secureLayer = nil
            secureTextField = nil
            return
        }

        parentLayer.addSublayer(window.layer)
        containerLayer.removeFromSuperlayer()

        secureLayer = nil
        secureTextField = nil
    }

    @objc private func handleBoundsChange() {
        DispatchQueue.main.async { [weak self] in
            guard let self = self,
                  let window = Self.keyWindow,
                  let containerLayer = self.secureLayer else { return }
            containerLayer.frame = window.bounds
            containerLayer.sublayers?.forEach { $0.frame = window.bounds }
        }
    }

    // MARK: - Screen Capture Protection (fallback overlay during recording)

    private func startScreenCaptureProtection() {
        guard screenCaptureProtectionObservation == nil else { return }
        screenCaptureProtectionObservation = NotificationCenter.default.addObserver(
            forName: UIScreen.capturedDidChangeNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            guard let self = self, self.isSecureEnabled else { return }
            if UIScreen.main.isCaptured {
                self.addScreenCaptureOverlay()
            } else {
                self.removeScreenCaptureOverlay()
            }
        }

        if UIScreen.main.isCaptured {
            addScreenCaptureOverlay()
        }
    }

    private func stopScreenCaptureProtection() {
        if let observation = screenCaptureProtectionObservation {
            NotificationCenter.default.removeObserver(observation)
            screenCaptureProtectionObservation = nil
        }
        removeScreenCaptureOverlay()
    }

    private func addScreenCaptureOverlay() {
        guard screenCaptureOverlay == nil, let window = Self.keyWindow else { return }
        let effect = UIBlurEffect(style: .systemThickMaterial)
        let view = UIVisualEffectView(effect: effect)
        view.frame = window.bounds
        view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        window.addSubview(view)
        self.screenCaptureOverlay = view
    }

    private func removeScreenCaptureOverlay() {
        screenCaptureOverlay?.removeFromSuperview()
        screenCaptureOverlay = nil
    }

    // MARK: - Screenshot Protection (overlay before screenshot capture)

    private func startScreenshotProtection() {
        guard screenshotProtectionObservation == nil else { return }
        screenshotProtectionObservation = NotificationCenter.default.addObserver(
            forName: UIApplication.userDidTakeScreenshotNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            guard let self = self, self.isSecureEnabled else { return }
            self.flashScreenshotOverlay()
        }
    }

    private func stopScreenshotProtection() {
        if let observation = screenshotProtectionObservation {
            NotificationCenter.default.removeObserver(observation)
            screenshotProtectionObservation = nil
        }
        removeScreenshotOverlay()
    }

    private func flashScreenshotOverlay() {
        guard screenshotOverlay == nil, let window = Self.keyWindow else { return }
        let effect = UIBlurEffect(style: .systemThickMaterial)
        let view = UIVisualEffectView(effect: effect)
        view.frame = window.bounds
        view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        window.addSubview(view)
        self.screenshotOverlay = view

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [weak self] in
            self?.removeScreenshotOverlay()
        }
    }

    private func removeScreenshotOverlay() {
        screenshotOverlay?.removeFromSuperview()
        screenshotOverlay = nil
    }

    // MARK: - App Switcher Blur

    @objc public func setAppSwitcherBlur(_ enable: Bool, style: String) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }

            if enable {
                let styleChanged = self.currentBlurStyle != style
                self.currentBlurStyle = style

                if !self.isBlurEnabled {
                    self.isBlurEnabled = true
                    self.registerBlurObservers()
                } else if styleChanged {
                    self.updateBlurStyleIfVisible()
                }
            } else if self.isBlurEnabled {
                self.isBlurEnabled = false
                self.unregisterBlurObservers()
                self.removeBlurOverlay()
            }
        }
    }

    private func updateBlurStyleIfVisible() {
        guard let view = blurView else { return }
        let newEffect = UIBlurEffect(style: blurEffectStyle(for: currentBlurStyle))
        view.effect = newEffect
    }

    private func registerBlurObservers() {
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(appWillResignActive),
            name: UIApplication.willResignActiveNotification,
            object: nil
        )
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(appDidBecomeActive),
            name: UIApplication.didBecomeActiveNotification,
            object: nil
        )
    }

    private func unregisterBlurObservers() {
        NotificationCenter.default.removeObserver(
            self,
            name: UIApplication.willResignActiveNotification,
            object: nil
        )
        NotificationCenter.default.removeObserver(
            self,
            name: UIApplication.didBecomeActiveNotification,
            object: nil
        )
    }

    @objc private func appWillResignActive() {
        DispatchQueue.main.async { [weak self] in
            self?.addBlurOverlay()
        }
    }

    @objc private func appDidBecomeActive() {
        DispatchQueue.main.async { [weak self] in
            self?.removeBlurOverlay()
        }
    }

    private func addBlurOverlay() {
        guard blurView == nil, let window = Self.keyWindow else { return }

        let effect = UIBlurEffect(style: blurEffectStyle(for: currentBlurStyle))
        let view = UIVisualEffectView(effect: effect)
        view.frame = window.bounds
        view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        window.addSubview(view)
        self.blurView = view
    }

    private func removeBlurOverlay() {
        blurView?.removeFromSuperview()
        blurView = nil
    }

    private func blurEffectStyle(for style: String) -> UIBlurEffect.Style {
        switch style.lowercased() {
        case "light":
            return .light
        case "dark":
            return .dark
        case "extralight":
            return .extraLight
        default:
            return .systemMaterial
        }
    }

    // MARK: - Screenshot Detection

    @objc public func startScreenshotObserver() {
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(screenshotDetected),
            name: UIApplication.userDidTakeScreenshotNotification,
            object: nil
        )
        startScreenCaptureDetection()
    }

    @objc public func stopScreenshotObserver() {
        NotificationCenter.default.removeObserver(
            self,
            name: UIApplication.userDidTakeScreenshotNotification,
            object: nil
        )
        stopScreenCaptureDetection()
    }

    @objc private func screenshotDetected() {
        onScreenshotTaken?()
    }

    private func startScreenCaptureDetection() {
        guard screenCaptureObservation == nil else { return }
        screenCaptureObservation = NotificationCenter.default.addObserver(
            forName: UIScreen.capturedDidChangeNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            guard let self = self else { return }
            self.onScreenRecordingStatusChanged?(UIScreen.main.isCaptured)
        }

        if UIScreen.main.isCaptured {
            onScreenRecordingStatusChanged?(true)
        }
    }

    private func stopScreenCaptureDetection() {
        if let observation = screenCaptureObservation {
            NotificationCenter.default.removeObserver(observation)
            screenCaptureObservation = nil
        }
    }

    // MARK: - Cleanup

    @objc public func invalidate() {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            self.disableSecureLayer()
            self.stopScreenCaptureProtection()
            self.stopScreenshotProtection()
            self.removeBlurOverlay()
            self.unregisterBlurObservers()
            self.stopScreenshotObserver()
            self.onScreenshotTaken = nil
            self.onScreenRecordingStatusChanged = nil
        }
    }

    // MARK: - Helpers

    private static var keyWindow: UIWindow? {
        return UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .flatMap { $0.windows }
            .first(where: { $0.isKeyWindow })
    }
}
