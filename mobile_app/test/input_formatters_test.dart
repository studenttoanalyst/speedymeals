import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:speedy_meals/core/input/input_formatters.dart';

/// Simulates typing [input] one character at a time at the end of the field.
String type(TextInputFormatter f, String input) {
  var value = TextEditingValue.empty;
  for (final ch in input.split('')) {
    final text = value.text + ch;
    value = f.formatEditUpdate(
      value,
      TextEditingValue(text: text, selection: TextSelection.collapsed(offset: text.length)),
    );
  }
  return value.text;
}

TextEditingValue paste(TextInputFormatter f, String text) => f.formatEditUpdate(
      TextEditingValue.empty,
      TextEditingValue(text: text, selection: TextSelection.collapsed(offset: text.length)),
    );

void main() {
  group('CnicInputFormatter', () {
    const f = CnicInputFormatter();

    test('inserts hyphens while typing', () {
      expect(type(f, '4210120450515'), '42101-2045051-5');
      expect(type(f, '42101'), '42101');
      expect(type(f, '421012'), '42101-2');
    });

    test('caps at 13 digits and ignores non-digits', () {
      expect(type(f, '42101204505159999'), '42101-2045051-5');
      expect(paste(f, '42101 2045051 5').text, '42101-2045051-5');
    });

    test('backspace over a hyphen keeps the cursor before it', () {
      // "42101-2" with the cursor after "-"; the user deletes the hyphen.
      final v = f.formatEditUpdate(
        const TextEditingValue(text: '42101-2', selection: TextSelection.collapsed(offset: 6)),
        const TextEditingValue(text: '421012', selection: TextSelection.collapsed(offset: 5)),
      );
      expect(v.text, '42101-2');
      expect(v.selection.baseOffset, 5);
    });
  });

  group('PkMobileInputFormatter', () {
    const f = PkMobileInputFormatter();

    test('spaces a national number as 3+7', () {
      expect(type(f, '3001234567'), '300 1234567');
      expect(type(f, '300'), '300');
    });

    test('spaces a trunk-zero number as 4+7', () {
      expect(type(f, '03001234567'), '0300 1234567');
    });

    test('drops a pasted +92 country code', () {
      expect(paste(f, '+92 334 2121401').text, '334 2121401');
      expect(paste(f, '923342121401').text, '334 2121401');
    });

    test('caps length', () {
      expect(type(f, '30012345678999'), '300 1234567');
    });
  });

  group('VehicleRegistrationInputFormatter', () {
    const f = VehicleRegistrationInputFormatter();

    test('uppercases and hyphenates letter/digit boundaries', () {
      expect(type(f, 'lea1234'), 'LEA-1234');
      expect(paste(f, 'leb 07 1234').text, 'LEB-071234');
    });

    test('strips punctuation the user typed', () {
      expect(paste(f, 'ABC--1234').text, 'ABC-1234');
    });
  });
}
