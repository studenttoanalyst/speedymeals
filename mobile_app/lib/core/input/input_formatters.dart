import 'package:flutter/services.dart';

/// Formatters that insert separators as the user types, so nobody has to type
/// spaces or hyphens themselves. Pasted text in any format is cleaned up too.
/// The cursor keeps its place relative to the characters the user typed.

/// Pakistani CNIC: `42101-1234567-8` (5-7-1 digits).
class CnicInputFormatter extends TextInputFormatter {
  const CnicInputFormatter();

  static String layout(String digits) {
    final b = StringBuffer(digits.substring(0, digits.length.clamp(0, 5)));
    if (digits.length > 5) b.write('-${digits.substring(5, digits.length.clamp(5, 12))}');
    if (digits.length > 12) b.write('-${digits.substring(12, 13)}');
    return b.toString();
  }

  @override
  TextEditingValue formatEditUpdate(TextEditingValue oldValue, TextEditingValue newValue) =>
      _reformat(newValue, _digitsOnly, 13, layout);
}

/// Pakistani mobile number after the `+92` prefix: `300 1234567`, or
/// `0300 1234567` when typed with the trunk zero. The repository strips
/// spaces and the leading zero before sending (normalizeNationalNumber).
class PkMobileInputFormatter extends TextInputFormatter {
  const PkMobileInputFormatter();

  static String layout(String digits) {
    final split = digits.startsWith('0') ? 4 : 3;
    if (digits.length <= split) return digits;
    return '${digits.substring(0, split)} ${digits.substring(split)}';
  }

  /// Digits only; a pasted international number (`+92 300…`, `92300…`)
  /// drops its country code since the field already shows `+92`.
  static String clean(String s) {
    final digits = _digitsOnly(s);
    return digits.startsWith('92') && digits.length > 10 ? digits.substring(2) : digits;
  }

  @override
  TextEditingValue formatEditUpdate(TextEditingValue oldValue, TextEditingValue newValue) {
    final max = clean(newValue.text).startsWith('0') ? 11 : 10;
    return _reformat(newValue, clean, max, layout);
  }
}

/// Vehicle registration plate: uppercase, with a hyphen wherever letters and
/// digits meet — `LEA1234` → `LEA-1234`, `LEB071234` → `LEB-071234`.
class VehicleRegistrationInputFormatter extends TextInputFormatter {
  const VehicleRegistrationInputFormatter();

  static String layout(String chars) {
    final b = StringBuffer();
    for (var i = 0; i < chars.length; i++) {
      if (i > 0 && _isDigit(chars[i]) != _isDigit(chars[i - 1])) b.write('-');
      b.write(chars[i]);
    }
    return b.toString();
  }

  @override
  TextEditingValue formatEditUpdate(TextEditingValue oldValue, TextEditingValue newValue) =>
      _reformat(newValue, (s) => s.toUpperCase().replaceAll(RegExp(r'[^A-Z0-9]'), ''), 12, layout);
}

String _digitsOnly(String s) => s.replaceAll(RegExp(r'[^0-9]'), '');
bool _isDigit(String c) => RegExp(r'[0-9]').hasMatch(c);
bool _isSignificant(String c) => RegExp(r'[A-Za-z0-9]').hasMatch(c);

/// Cleans [value] to its significant characters (capped at [maxLength]),
/// lays them out with separators, and maps the cursor so it stays after the
/// same number of significant characters it was after before.
TextEditingValue _reformat(
  TextEditingValue value,
  String Function(String) clean,
  int maxLength,
  String Function(String) layout,
) {
  var significant = clean(value.text);
  if (significant.length > maxLength) significant = significant.substring(0, maxLength);
  final text = layout(significant);

  final cursor = value.selection.isValid ? value.selection.end.clamp(0, value.text.length) : value.text.length;
  final before = clean(value.text.substring(0, cursor)).length.clamp(0, significant.length);
  var offset = 0;
  for (var seen = 0; offset < text.length && seen < before; offset++) {
    if (_isSignificant(text[offset])) seen++;
  }
  return TextEditingValue(text: text, selection: TextSelection.collapsed(offset: offset));
}
