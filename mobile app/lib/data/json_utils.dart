/// Defensive JSON readers.
///
/// The backend is Pydantic-typed, so values normally arrive in the shape the
/// schema declares — but a null field, a numeric-as-string, or a missing key
/// must never crash a screen. Every model parses through these helpers instead
/// of casting (`as double`, `as String`), which turns a bad payload into a
/// sensible default rather than a runtime `TypeError`.
library;

class Json {
  Json._();

  // ------------------------------------------------------------------ scalars

  static String? asStringOrNull(Object? value) {
    if (value == null) return null;
    if (value is String) {
      final trimmed = value.trim();
      return trimmed.isEmpty ? null : trimmed;
    }
    return '$value';
  }

  static String asString(Object? value, {String fallback = ''}) =>
      asStringOrNull(value) ?? fallback;

  static double? asDoubleOrNull(Object? value) {
    if (value == null) return null;
    if (value is num) return value.toDouble();
    if (value is String) return double.tryParse(value.trim());
    return null;
  }

  static double asDouble(Object? value, {double fallback = 0}) =>
      asDoubleOrNull(value) ?? fallback;

  static int? asIntOrNull(Object? value) {
    if (value == null) return null;
    if (value is int) return value;
    if (value is num) return value.round();
    if (value is String) {
      final parsed = int.tryParse(value.trim());
      if (parsed != null) return parsed;
      return double.tryParse(value.trim())?.round();
    }
    return null;
  }

  static int asInt(Object? value, {int fallback = 0}) =>
      asIntOrNull(value) ?? fallback;

  static bool asBool(Object? value, {bool fallback = false}) {
    if (value == null) return fallback;
    if (value is bool) return value;
    if (value is num) return value != 0;
    if (value is String) {
      final lower = value.trim().toLowerCase();
      if (lower == 'true' || lower == '1' || lower == 'yes') return true;
      if (lower == 'false' || lower == '0' || lower == 'no') return false;
    }
    return fallback;
  }

  // ---------------------------------------------------------------- date/time

  /// Parses an ISO-8601 timestamp and converts it to local time for display.
  ///
  /// The backend stores timezone-aware UTC timestamps (`placed_at: datetime`
  /// with `DateTime(timezone=True)`), so a naive parse would show the wrong
  /// wall-clock time to a customer in PKT.
  static DateTime? asDateTimeOrNull(Object? value) {
    final raw = asStringOrNull(value);
    if (raw == null) return null;
    final parsed = DateTime.tryParse(raw);
    return parsed?.toLocal();
  }

  /// Parses a backend `Time` column (`"18:30:00"`) into a display string
  /// (`"6:30 PM"`). Returns null when absent so callers can hide the row.
  static String? asClockString(Object? value) {
    final raw = asStringOrNull(value);
    if (raw == null) return null;
    final parts = raw.split(':');
    if (parts.length < 2) return null;
    final hour = int.tryParse(parts[0]);
    final minute = int.tryParse(parts[1]);
    if (hour == null || minute == null) return null;

    final period = hour >= 12 ? 'PM' : 'AM';
    final displayHour = hour % 12 == 0 ? 12 : hour % 12;
    final displayMinute = minute.toString().padLeft(2, '0');
    return '$displayHour:$displayMinute $period';
  }

  // ------------------------------------------------------------------ objects

  static Map<String, dynamic>? asMapOrNull(Object? value) {
    if (value is Map<String, dynamic>) return value;
    if (value is Map) return Map<String, dynamic>.from(value);
    return null;
  }

  /// Maps a JSON array into a list of typed models, skipping malformed entries
  /// rather than failing the whole response.
  static List<T> asList<T>(
    Object? value,
    T Function(Map<String, dynamic> json) fromJson,
  ) {
    if (value is! List) return const [];
    final result = <T>[];
    for (final entry in value) {
      final map = asMapOrNull(entry);
      if (map == null) continue;
      result.add(fromJson(map));
    }
    return result;
  }

  static List<String> asStringList(Object? value) {
    if (value is! List) return const [];
    return value
        .map(asStringOrNull)
        .whereType<String>()
        .toList(growable: false);
  }

  static List<double> asDoubleList(Object? value) {
    if (value is! List) return const [];
    return value
        .map(asDoubleOrNull)
        .whereType<double>()
        .toList(growable: false);
  }
}

/// Formats a PKR amount the way the design does: grouped, no decimals when the
/// value is whole (`Rs. 1,250`) and two decimals otherwise (`Rs. 1,250.50`).
String formatPkr(double amount) {
  final negative = amount < 0;
  final absolute = amount.abs();
  final isWhole = (absolute - absolute.roundToDouble()).abs() < 0.005;
  final fixed = absolute.toStringAsFixed(isWhole ? 0 : 2);
  final parts = fixed.split('.');

  final digits = parts[0];
  final buffer = StringBuffer();
  for (var i = 0; i < digits.length; i++) {
    if (i > 0 && (digits.length - i) % 3 == 0) buffer.write(',');
    buffer.write(digits[i]);
  }

  final grouped =
      parts.length > 1 ? '${buffer.toString()}.${parts[1]}' : buffer.toString();
  return '${negative ? '-' : ''}Rs. $grouped';
}
