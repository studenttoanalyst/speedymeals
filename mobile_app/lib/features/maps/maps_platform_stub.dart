/// Native platforms: the Maps SDK is linked into the app binary.
bool get mapsAvailable => true;

/// Native platforms: nothing to load.
Future<void> ensureMapsLoaded() async {}
