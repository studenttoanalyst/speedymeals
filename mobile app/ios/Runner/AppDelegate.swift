import Flutter
import UIKit
import GoogleMaps

@main
@objc class AppDelegate: FlutterAppDelegate, FlutterImplicitEngineDelegate {
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    // Configure iOS-restricted Google Maps API key when provided.
    // Sourced from Info.plist "GoogleMapsAPIKey" or build environment.
    if let mapsApiKey = Bundle.main.object(forInfoDictionaryKey: "GoogleMapsAPIKey") as? String,
       !mapsApiKey.isEmpty && !mapsApiKey.hasPrefix("$(") {
      GMSServices.provideAPIKey(mapsApiKey)
    }
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  func didInitializeImplicitFlutterEngine(_ engineBridge: FlutterImplicitEngineBridge) {
    GeneratedPluginRegistrant.register(with: engineBridge.pluginRegistry)
  }
}
