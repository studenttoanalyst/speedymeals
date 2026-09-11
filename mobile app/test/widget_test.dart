// Basic widget test for Speedy Meals app.
// Tests that the app can be instantiated and the splash screen displays correctly.

import 'package:flutter_test/flutter_test.dart';

import 'package:speedy_meals/main.dart';

void main() {
  testWidgets('Splash screen displays app title and tagline', (WidgetTester tester) async {
    // Build the app widget.
    await tester.pumpWidget(const SpeedyMealsApp());

    // Verify that the splash screen shows the app title and tagline.
    expect(find.text('Speedy Meals'), findsOneWidget);
    expect(find.text('Lightning Fast Delights'), findsOneWidget);
  });
}
