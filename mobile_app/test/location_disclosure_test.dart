// Tests for the prominent location disclosure shown before the first OS
// location permission prompt (Google Play location policy).

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:speedy_meals/widgets/location_disclosure.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  /// Pumps a host screen whose "trigger" button runs [onPressed] with access
  /// to its BuildContext.
  Future<void> pumpHost(WidgetTester tester, Future<void> Function() onPressed) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: Builder(
            builder: (context) => ElevatedButton(
              onPressed: () async {
                await onPressed();
              },
              child: const Text('Use location'),
            ),
          ),
        ),
      ),
    );
  }

  testWidgets('rider disclosure appears before any permission work and is persisted',
      (tester) async {
    bool? proceeded;
    await pumpHost(tester, () async {
      proceeded = await LocationDisclosure.ensureRiderAcknowledged(tester.element(find.byType(ElevatedButton)));
    });

    await tester.tap(find.byType(ElevatedButton));
    await tester.pumpAndSettle();

    // The disclosure is shown before anything else can ask for permission.
    expect(find.byType(AlertDialog), findsOneWidget);
    expect(find.text('Location sharing during deliveries'), findsOneWidget);
    expect(find.textContaining('background or the screen is turned off'), findsOneWidget);
    expect(find.textContaining('never shared with advertisers'), findsOneWidget);
    expect(proceeded, isNull); // still on screen, so nothing has proceeded yet

    await tester.tap(find.text('Share my location'));
    await tester.pumpAndSettle();

    expect(proceeded, isTrue);
    expect(find.byType(AlertDialog), findsNothing);
    expect(await LocationDisclosure.isRiderAcknowledged(), isTrue);
  });

  testWidgets('rider disclosure is not shown again once acknowledged',
      (tester) async {
    // First acknowledgement runs through the trigger button (like the flow
    // above): awaiting ensureRiderAcknowledged() directly in the test body
    // would block on the undismissed dialog and time out.
    await pumpHost(tester, () async {
      await LocationDisclosure.ensureRiderAcknowledged(
          tester.element(find.byType(ElevatedButton)));
    });
    await tester.tap(find.byType(ElevatedButton));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Share my location'));
    await tester.pumpAndSettle();

    expect(await LocationDisclosure.isRiderAcknowledged(), isTrue);

    // Second call: straight through, no dialog.
    final second = await LocationDisclosure.ensureRiderAcknowledged(
        tester.element(find.byType(ElevatedButton)));
    await tester.pumpAndSettle();

    expect(second, isTrue);
    expect(find.byType(AlertDialog), findsNothing);
  });

  testWidgets('"Not now" stops the flow and is not recorded as accepted',
      (tester) async {
    bool? proceeded;
    await pumpHost(tester, () async {
      proceeded = await LocationDisclosure.ensureRiderAcknowledged(
          tester.element(find.byType(ElevatedButton)));
    });

    await tester.tap(find.byType(ElevatedButton));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Not now'));
    await tester.pumpAndSettle();

    expect(proceeded, isFalse);
    expect(await LocationDisclosure.isRiderAcknowledged(), isFalse);
  });

  testWidgets('customer disclosure uses foreground wording only',
      (tester) async {
    // Same pattern as above: open the dialog from the trigger button instead
    // of awaiting it in the test body, or the await never resolves.
    bool? proceeded;
    await pumpHost(tester, () async {
      proceeded = await LocationDisclosure.ensureCustomerAcknowledged(
          tester.element(find.byType(ElevatedButton)));
    });
    await tester.tap(find.byType(ElevatedButton));
    await tester.pumpAndSettle();

    expect(find.byType(AlertDialog), findsOneWidget);
    expect(find.text('Use your location'), findsOneWidget);
    // Background collection statement is rider-only.
    expect(find.textContaining('background or the screen is turned off'),
        findsNothing);

    await tester.tap(find.text('Continue'));
    await tester.pumpAndSettle();

    expect(proceeded, isTrue);
    expect(await LocationDisclosure.isCustomerAcknowledged(), isTrue);
    expect(await LocationDisclosure.isRiderAcknowledged(), isFalse);
  });
}
