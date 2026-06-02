import UIKit

@objc public final class SecureCanvasFactory: NSObject {

    /// Creates a UITextField configured for secure-text canvas extraction.
    @objc public static func makeSecureTextField(frame: CGRect) -> UITextField {
        let field = UITextField(frame: frame)
        field.isSecureTextEntry = true
        field.isUserInteractionEnabled = false
        field.isEnabled = false
        field.backgroundColor = .clear
        field.borderStyle = .none
        field.textColor = .clear
        field.tintColor = .clear
        field.isOpaque = false
        field.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        return field
    }

    /// GPU-protected canvas layer used for global window reparenting.
    @objc public static func canvasLayer(from field: UITextField) -> CALayer? {
        field.layer.sublayers?.first
    }

    /// GPU-protected canvas view used for Fabric SecureView child mounting.
    @objc public static func canvasView(from field: UITextField) -> UIView? {
        field.subviews.first
    }

    /// Primes layout so canvas sublayers/views exist (call after adding to a window hierarchy).
    @objc public static func primeLayout(for field: UITextField, in window: UIWindow?) {
        guard let window = window else {
            field.layoutIfNeeded()
            return
        }
        window.addSubview(field)
        field.layoutIfNeeded()
        field.removeFromSuperview()
    }
}
