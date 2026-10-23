/// Platform glue for Google Maps.
///
/// Android/iOS load the Maps SDK natively (key from local.properties /
/// Info.plist), so these are no-ops there. On web the Maps JavaScript API must
/// be on the page before a [GoogleMap] is created, otherwise it throws
/// "Cannot read properties of undefined (reading 'maps')". The web
/// implementation injects the script using `--dart-define=MAPS_API_KEY=...`
/// and lets [MapView] fall back gracefully when no key is configured.
library;

export 'maps_platform_stub.dart' if (dart.library.js_interop) 'maps_platform_web.dart';
