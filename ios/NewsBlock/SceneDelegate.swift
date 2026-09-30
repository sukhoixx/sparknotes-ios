import UIKit

@objc class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene,
          let appDelegate = UIApplication.shared.delegate as? AppDelegate,
          let factory = appDelegate.reactNativeFactory else { return }

    let win = UIWindow(windowScene: windowScene)
    self.window = win
    appDelegate.window = win

    factory.startReactNative(
      withModuleName: "main",
      in: win,
      launchOptions: appDelegate.launchOptions
    )
  }
}
