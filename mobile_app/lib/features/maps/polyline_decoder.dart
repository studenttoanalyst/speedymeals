import 'package:google_maps_flutter/google_maps_flutter.dart';

/// Decodes a Google-encoded polyline (precision 5) into map coordinates.
///
/// The backend's `overview_polyline.points` (Point 3 route geometry) arrives as
/// an encoded string; this turns it into the `LatLng` points `MapView` draws.
///
/// Written locally instead of pulling in `flutter_polyline_points` (not a
/// dependency). Malformed input returns an empty list so the caller simply
/// skips the route — a fabricated path is never drawn.
class PolylineDecoder {
  PolylineDecoder._();

  /// Google encodes at precision 5, i.e. 1e-5 degrees per integer unit.
  static const double _factor = 1e-5;

  static List<LatLng> decode(String? encoded) {
    if (encoded == null || encoded.isEmpty) return const [];

    final points = <LatLng>[];
    var index = 0;
    var lat = 0;
    var lng = 0;

    while (index < encoded.length) {
      final latDelta = _decodeValue(encoded, index);
      if (latDelta == null) return const [];
      lat += latDelta.value;
      index = latDelta.nextIndex;

      final lngDelta = _decodeValue(encoded, index);
      if (lngDelta == null) return const [];
      lng += lngDelta.value;
      index = lngDelta.nextIndex;

      points.add(LatLng(lat * _factor, lng * _factor));
    }

    return points;
  }

  /// Reads one encoded signed delta, returning null on malformed input.
  static _DecodedValue? _decodeValue(String encoded, int start) {
    var result = 0;
    var shift = 0;
    var index = start;
    int current;

    do {
      if (index >= encoded.length) return null;
      current = encoded.codeUnitAt(index++) - 63;
      if (current < 0) return null;
      result |= (current & 0x1f) << shift;
      shift += 5;
    } while (current >= 0x20);

    // Zig-zag decoding: the low bit is the sign.
    final delta = (result & 1) != 0 ? ~(result >> 1) : (result >> 1);
    return _DecodedValue(delta, index);
  }
}

class _DecodedValue {
  final int value;
  final int nextIndex;

  const _DecodedValue(this.value, this.nextIndex);
}
