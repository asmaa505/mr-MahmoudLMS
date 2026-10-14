import UIKit
import WebKit
import AVFoundation

/**
 * iOS Native Security Wrapper for Mr. Mahmoud LMS
 *
 * Utilizes the Apple iOS secure layer hack (UITextField with isSecureTextEntry = true).
 * When a view hierarchy is placed inside the subviews of a secure UITextField,
 * iOS graphics compositor (CoreAnimation) automatically marks the layer as DRM-protected.
 *
 * Result:
 * 1. Native iOS Screen Recording records a pitch black rectangle in place of the view.
 * 2. iOS Screenshots (Side + Volume Up) capture a blank white or black container.
 * 3. AirPlay display mirroring automatically masks the video content.
 */
class SecureContainerView: UIView {
    private let secureTextField = UITextField()

    override init(frame: CGRect) {
        super.init(frame: frame)
        setupSecureView()
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupSecureView()
    }

    private func setupSecureView() {
        secureTextField.isSecureTextEntry = true
        secureTextField.isUserInteractionEnabled = false
        addSubview(secureTextField)
        secureTextField.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            secureTextField.topAnchor.constraint(equalTo: topAnchor),
            secureTextField.bottomAnchor.constraint(equalTo: bottomAnchor),
            secureTextField.leadingAnchor.constraint(equalTo: leadingAnchor),
            secureTextField.trailingAnchor.constraint(equalTo: trailingAnchor)
        ])

        // Embed target webview or player inside the secured canvas layer
        if let secureCanvas = secureTextField.subviews.first {
            secureCanvas.isUserInteractionEnabled = true
        }
    }

    func attachSecureContent(_ contentView: UIView) {
        if let secureCanvas = secureTextField.subviews.first {
            secureCanvas.addSubview(contentView)
            contentView.translatesAutoresizingMaskIntoConstraints = false
            NSLayoutConstraint.activate([
                contentView.topAnchor.constraint(equalTo: secureCanvas.topAnchor),
                contentView.bottomAnchor.constraint(equalTo: secureCanvas.bottomAnchor),
                contentView.leadingAnchor.constraint(equalTo: secureCanvas.leadingAnchor),
                contentView.trailingAnchor.constraint(equalTo: secureCanvas.trailingAnchor)
            ])
        } else {
            addSubview(contentView)
        }
    }
}
