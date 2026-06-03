import UIKit

@objc public class ScreenSecurityManager: NSObject {

    @objc public var onScreenshotTaken: (() -> Void)?
    @objc public var onScreenRecordingStatusChanged: ((_ isCaptured: Bool) -> Void)?

    private weak var hostWindow: UIWindow?
    private var secureTextField: UITextField?
    private var blurView: UIVisualEffectView?
    private var screenCaptureOverlay: UIVisualEffectView?
    private var currentBlurStyle: String = "system"
    private var isBlurEnabled = false
    private var isSecureEnabled = false
    private var secureWindowRefCount = 0
    private var blurRefCount = 0
    private var screenCaptureObservation: NSObjectProtocol?
    private var screenCaptureProtectionObservation: NSObjectProtocol?
    private var sceneActivationObservation: NSObjectProtocol?
    private var secureLayer: CALayer?
    private var boundsObservation: NSKeyValueObservation?

    @objc public override init() {
        super.init()
        registerSceneActivationObserver()
    }

    deinit {
        if let observation = sceneActivationObservation {
            NotificationCenter.default.removeObserver(observation)
        }
    }

    // MARK: - Public State

    @objc public var secureWindowActive: Bool {
        return isSecureEnabled
    }

    @objc public var appSwitcherBlurActive: Bool {
        return isBlurEnabled
    }

    @objc public func attachToWindow(_ window: UIWindow) {
        hostWindow = window
        if isSecureEnabled {
            restartBoundsObservation()
        }
    }

    // MARK: - Secure Window

    @objc public func setSecureWindow(_ enable: Bool) {
        let work = { [weak self] in
            guard let self = self else { return }

            if enable {
                self.secureWindowRefCount += 1
                guard self.secureWindowRefCount == 1 else { return }
                self.isSecureEnabled = true
                self.enableSecureLayer()
                self.startScreenCaptureProtection()
            } else {
                guard self.secureWindowRefCount > 0 else { return }
                self.secureWindowRefCount -= 1
                guard self.secureWindowRefCount == 0 else { return }
                self.isSecureEnabled = false
                self.disableSecureLayer()
                self.stopScreenCaptureProtection()
            }
        }

        if Thread.isMainThread {
            work()
        } else if enable {
            DispatchQueue.main.sync(execute: work)
        } else {
            DispatchQueue.main.async(execute: work)
        }
    }

    private func enableSecureLayer() {
        guard secureTextField == nil else { return }
        guard let window = resolvedWindow,
              let parentLayer = window.layer.superlayer else { return }

        let field = SecureCanvasFactory.makeSecureTextField(
            frame: CGRect(x: 0, y: 0, width: 1, height: 1)
        )
        SecureCanvasFactory.primeLayout(for: field, in: window)

        guard let containerLayer = SecureCanvasFactory.canvasLayer(from: field) else {
            return
        }

        containerLayer.frame = window.bounds
        containerLayer.sublayers?.forEach { $0.frame = window.bounds }

        parentLayer.addSublayer(containerLayer)
        containerLayer.addSublayer(window.layer)

        secureTextField = field
        secureLayer = containerLayer
        startBoundsObservation()
    }

    private func disableSecureLayer() {
        if let window = resolvedWindow, let containerLayer = secureLayer {
            if let parentLayer = containerLayer.superlayer {
                parentLayer.addSublayer(window.layer)
            }
            containerLayer.removeFromSuperlayer()
        }

        stopBoundsObservation()
        secureLayer = nil
        secureTextField = nil
    }

    private func startBoundsObservation() {
        stopBoundsObservation()
        guard let window = resolvedWindow else { return }
        boundsObservation = window.observe(\.bounds, options: [.new]) { [weak self] window, _ in
            DispatchQueue.main.async {
                self?.updateLayerFrames(for: window)
            }
        }
    }

    private func restartBoundsObservation() {
        guard isSecureEnabled else { return }
        startBoundsObservation()
    }

    private func stopBoundsObservation() {
        boundsObservation = nil
    }

    private func updateLayerFrames(for window: UIWindow) {
        guard let containerLayer = secureLayer else { return }
        containerLayer.frame = window.bounds
        containerLayer.sublayers?.forEach { $0.frame = window.bounds }
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
        guard screenCaptureOverlay == nil, let window = resolvedWindow else { return }
        let effect = UIBlurEffect(style: .systemThickMaterial)
        let view = UIVisualEffectView(effect: effect)
        view.frame = window.bounds
        view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        window.addSubview(view)
        screenCaptureOverlay = view
    }

    private func removeScreenCaptureOverlay() {
        screenCaptureOverlay?.removeFromSuperview()
        screenCaptureOverlay = nil
    }

    // MARK: - App Switcher Blur

    @objc public func setAppSwitcherBlur(_ enable: Bool, style: String) {
        let work = { [weak self] in
            guard let self = self else { return }

            if enable {
                let styleChanged = self.currentBlurStyle != style
                self.currentBlurStyle = style
                self.blurRefCount += 1

                if self.blurRefCount == 1 {
                    self.isBlurEnabled = true
                    self.registerBlurObservers()
                } else if styleChanged {
                    self.updateBlurStyleIfVisible()
                }
            } else {
                guard self.blurRefCount > 0 else { return }
                self.blurRefCount -= 1
                guard self.blurRefCount == 0 else { return }
                self.isBlurEnabled = false
                self.unregisterBlurObservers()
                self.removeBlurOverlay()
            }
        }

        if Thread.isMainThread {
            work()
        } else if enable {
            DispatchQueue.main.sync(execute: work)
        } else {
            DispatchQueue.main.async(execute: work)
        }
    }

    private func updateBlurStyleIfVisible() {
        guard let view = blurView else { return }
        view.effect = UIBlurEffect(style: blurEffectStyle(for: currentBlurStyle))
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
        guard blurView == nil, let window = resolvedWindow else { return }

        let effect = UIBlurEffect(style: blurEffectStyle(for: currentBlurStyle))
        let view = UIVisualEffectView(effect: effect)
        view.frame = window.bounds
        view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        window.addSubview(view)
        blurView = view
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
        let work = { [weak self] in
            guard let self = self else { return }
            self.secureWindowRefCount = 0
            self.blurRefCount = 0
            self.isSecureEnabled = false
            self.isBlurEnabled = false
            self.disableSecureLayer()
            self.stopScreenCaptureProtection()
            self.removeBlurOverlay()
            self.unregisterBlurObservers()
            self.stopScreenshotObserver()
            self.onScreenshotTaken = nil
            self.onScreenRecordingStatusChanged = nil
        }

        if Thread.isMainThread {
            work()
        } else {
            DispatchQueue.main.sync(execute: work)
        }
    }

    // MARK: - Scene / Window Resolution

    private func registerSceneActivationObserver() {
        sceneActivationObservation = NotificationCenter.default.addObserver(
            forName: UIScene.didActivateNotification,
            object: nil,
            queue: .main
        ) { [weak self] notification in
            guard let self = self,
                  let scene = notification.object as? UIWindowScene,
                  let window = scene.windows.first(where: { $0.isKeyWindow }) else { return }
            self.hostWindow = window
            self.restartBoundsObservation()
        }
    }

    private var resolvedWindow: UIWindow? {
        if let host = hostWindow, host.windowScene != nil {
            return host
        }
        return Self.foregroundKeyWindow()
    }

    private static func foregroundKeyWindow() -> UIWindow? {
        UIApplication.shared.connectedScenes
            .filter { $0.activationState == .foregroundActive }
            .compactMap { $0 as? UIWindowScene }
            .flatMap { $0.windows }
            .first(where: { $0.isKeyWindow })
    }
}
