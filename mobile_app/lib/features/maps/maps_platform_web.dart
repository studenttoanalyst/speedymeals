import 'dart:async';
import 'dart:js_interop';
import 'dart:js_interop_unsafe';

import 'package:web/web.dart' as web;

/// Browser key for the Maps JavaScript API, passed at build/run time:
///   `flutter run -d chrome --dart-define=MAPS_API_KEY=YOUR_KEY`
/// Restrict the key by HTTP referrer in Google Cloud Console.
const String _mapsApiKey = String.fromEnvironment('MAPS_API_KEY');

/// True once `window.google.maps` exists on the page.
bool get mapsAvailable {
  final google = globalContext['google'];
  return google != null && google.isA<JSObject>() && (google as JSObject).has('maps');
}

/// Injects the Maps JavaScript API once, before the app starts. Without a key
/// it returns immediately and [MapView] shows its fallback instead of crashing.
Future<void> ensureMapsLoaded() async {
  if (mapsAvailable || _mapsApiKey.isEmpty) return;

  final loaded = Completer<void>();
  final script = web.HTMLScriptElement()
    ..src = 'https://maps.googleapis.com/maps/api/js?key=${Uri.encodeComponent(_mapsApiKey)}'
    ..async = true;
  void finish(web.Event _) {
    if (!loaded.isCompleted) loaded.complete();
  }

  script.addEventListener('load', finish.toJS);
  script.addEventListener('error', finish.toJS);
  web.document.head!.append(script);

  // Never block app start for long on a slow or blocked network.
  await loaded.future.timeout(const Duration(seconds: 10), onTimeout: () {});
}
