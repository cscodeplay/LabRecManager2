import UIKit
import AVFoundation
import WebKit
import Security
import Capacitor

/// Wraps Capacitor's default WKNavigationDelegate to trust the bundled LabRec Local Root CA
/// for local LAN HTTPS access while forwarding all navigation & Capacitor bridge events unchanged.
private final class LabRecNavigationProxy: NSObject, WKNavigationDelegate {
    private let target: WKNavigationDelegate
    private let localRootCA: SecCertificate?

    init(wrapping target: WKNavigationDelegate) {
        self.target = target
        if let url = Bundle.main.url(forResource: "labrec-rootCA", withExtension: "cer", subdirectory: "public"),
           let data = try? Data(contentsOf: url),
           let cert = SecCertificateCreateWithData(nil, data as CFData) {
            self.localRootCA = cert
        } else {
            self.localRootCA = nil
        }
        super.init()
    }

    func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
        target.webView?(webView, didStartProvisionalNavigation: navigation)
    }

    func webView(
        _ webView: WKWebView,
        decidePolicyFor navigationAction: WKNavigationAction,
        decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
    ) {
        if let method = target.webView(_:decidePolicyFor:decisionHandler:) as ((WKWebView, WKNavigationAction, @escaping (WKNavigationActionPolicy) -> Void) -> Void)? {
            method(webView, navigationAction, decisionHandler)
        } else {
            decisionHandler(.allow)
        }
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        target.webView?(webView, didFinish: navigation)
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        target.webView?(webView, didFail: navigation, withError: error)
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        target.webView?(webView, didFailProvisionalNavigation: navigation, withError: error)
    }

    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        target.webViewWebContentProcessDidTerminate?(webView)
    }

    func webView(
        _ webView: WKWebView,
        didReceive challenge: URLAuthenticationChallenge,
        completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void
    ) {
        if challenge.protectionSpace.authenticationMethod == NSURLAuthenticationMethodServerTrust,
           let serverTrust = challenge.protectionSpace.serverTrust,
           let caCert = localRootCA {
            SecTrustSetAnchorCertificates(serverTrust, [caCert] as CFArray)
            SecTrustSetAnchorCertificatesOnly(serverTrust, false)
            var evalError: CFError?
            if SecTrustEvaluateWithError(serverTrust, &evalError) {
                completionHandler(.useCredential, URLCredential(trust: serverTrust))
                return
            }
        }
        completionHandler(.performDefaultHandling, nil)
    }
}

@objc(LabRecBridgeViewController)
class LabRecBridgeViewController: CAPBridgeViewController {
    private var navigationProxy: LabRecNavigationProxy?

    override open func capacitorDidLoad() {
        super.capacitorDidLoad()
        if let wv = webView, let existingDelegate = wv.navigationDelegate {
            let proxy = LabRecNavigationProxy(wrapping: existingDelegate)
            self.navigationProxy = proxy
            wv.navigationDelegate = proxy
        }
        // Purge only HTTP disk/memory caches on cold launch so live Render deployments load immediately,
        // while keeping localStorage, cookies, and IndexedDB login sessions intact.
        URLCache.shared.removeAllCachedResponses()
        WKWebsiteDataStore.default().removeData(
            ofTypes: [WKWebsiteDataTypeDiskCache, WKWebsiteDataTypeMemoryCache],
            modifiedSince: Date.distantPast
        ) { [weak self] in
            DispatchQueue.main.async {
                if let wv = self?.webView, let scheme = wv.url?.scheme, scheme.hasPrefix("http") {
                    wv.reloadFromOrigin()
                }
            }
        }
    }
}

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Clear shared URLCache before the initial WebView navigation starts
        URLCache.shared.removeAllCachedResponses()
        // Keep iPad screen awake during interactive whiteboard teaching sessions
        UIApplication.shared.isIdleTimerDisabled = true
        // Request native camera & microphone permissions cleanly on first app startup
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) { [weak self] in
            self?.requestStartupMediaPermissionsIfNeeded()
        }
        return true
    }

    private func requestStartupMediaPermissionsIfNeeded() {
        let requestAudioIfNeeded: () -> Void = {
            if AVCaptureDevice.authorizationStatus(for: .audio) == .notDetermined {
                AVCaptureDevice.requestAccess(for: .audio) { _ in }
            }
        }

        if AVCaptureDevice.authorizationStatus(for: .video) == .notDetermined {
            AVCaptureDevice.requestAccess(for: .video) { _ in
                DispatchQueue.main.async {
                    requestAudioIfNeeded()
                }
            }
        } else {
            requestAudioIfNeeded()
        }
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}
