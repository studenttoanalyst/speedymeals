import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Prominent in-app location disclosure.
///
/// Google Play requires an app that collects location while the app is not
/// visible (rider GPS during an active delivery) to explain, in a dialog shown
/// *before* the OS permission prompt, exactly what is collected, why, and when
/// collection continues in the background.
///
/// The rider flow must show this dialog the first time location is requested;
/// the customer flow (pin drop / "use my current location") shows the
/// foreground-only wording. Once the rider has acknowledged it, the dialog is
/// never shown again.
class LocationDisclosure {
  LocationDisclosure._();

  static const String riderAcknowledgedKey = 'location_disclosure_rider_v1';
  static const String customerAcknowledgedKey = 'location_disclosure_customer_v1';

  /// True when the rider has already accepted the disclosure, so no dialog is
  /// needed before the permission request.
  static Future<bool> isRiderAcknowledged() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(riderAcknowledgedKey) ?? false;
  }

  /// True when the customer has already accepted the disclosure.
  static Future<bool> isCustomerAcknowledged() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(customerAcknowledgedKey) ?? false;
  }

  /// Shows the disclosure if it has not been acknowledged yet.
  ///
  /// Returns `true` when the caller may proceed to the OS permission request
  /// (either because it was already acknowledged or because the user tapped
  /// **Continue**), and `false` when the user dismissed it.
  static Future<bool> ensureRiderAcknowledged(BuildContext context) =>
      _ensure(context: context, key: riderAcknowledgedKey, isRider: true);

  /// Customer variant: foreground-only wording, no background statement.
  static Future<bool> ensureCustomerAcknowledged(BuildContext context) =>
      _ensure(context: context, key: customerAcknowledgedKey, isRider: false);

  static Future<bool> _ensure({
    required BuildContext context,
    required String key,
    required bool isRider,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    if (prefs.getBool(key) ?? false) return true;
    if (!context.mounted) return false;

    final accepted = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) => _LocationDisclosureDialog(isRider: isRider),
    );
    if (accepted != true) return false;

    await prefs.setBool(key, true);
    return true;
  }
}

class _LocationDisclosureDialog extends StatelessWidget {
  const _LocationDisclosureDialog({required this.isRider});

  final bool isRider;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return AlertDialog(
      title: Text(isRider ? 'Location sharing during deliveries' : 'Use your location'),
      content: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              isRider
                  ? 'SpeedyMeals collects your precise location while you are '
                      'logged in as a rider, so customers can follow you in real '
                      'time and so the next order is offered to riders near you.'
                  : 'SpeedyMeals uses your precise location to show restaurants '
                      'near you and to prefill a delivery address.',
              style: theme.textTheme.bodyMedium,
            ),
            const SizedBox(height: 12),
            if (isRider) ...[
              Text(
                'During an active delivery this continues while the app is in '
                'the background or the screen is turned off, as a foreground '
                'service with a persistent notification you can see. Location '
                'sharing stops as soon as the delivery is completed or you go '
                'offline.',
                style: theme.textTheme.bodyMedium,
              ),
              const SizedBox(height: 12),
            ],
            Text(
              'What is shared: the coordinates you are sending at that moment, '
              'with the order you are delivering (rider) or the address you are '
              'creating (customer). Location is never shared with advertisers, '
              'and it is encrypted in transit.',
              style: theme.textTheme.bodyMedium,
            ),
            if (isRider) ...[
              const SizedBox(height: 12),
              Text(
                'You can stop sharing at any time from the rider dashboard by '
                'going offline, or by revoking location permission in system '
                'settings.',
                style: theme.textTheme.bodyMedium,
              ),
            ],
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(false),
          child: const Text('Not now'),
        ),
        FilledButton(
          onPressed: () => Navigator.of(context).pop(true),
          child: Text(isRider ? 'Share my location' : 'Continue'),
        ),
      ],
    );
  }
}
