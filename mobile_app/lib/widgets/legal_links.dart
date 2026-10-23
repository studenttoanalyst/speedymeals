import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../core/constants/app_constants.dart';
import '../core/theme/app_tokens.dart';

/// Reusable utility for launching verified legal and policy URLs.
class LegalUtils {
  LegalUtils._();

  static Future<void> openUrl(BuildContext context, String urlString) async {
    final uri = Uri.tryParse(urlString);
    if (uri == null) {
      _showError(context, 'Invalid URL.');
      return;
    }

    try {
      final launched = await launchUrl(
        uri,
        mode: LaunchMode.externalApplication,
      );
      if (!launched && context.mounted) {
        // Fallback to platform default if external application fails
        final fallbackLaunched = await launchUrl(uri);
        if (!fallbackLaunched && context.mounted) {
          _showError(context, 'Could not open browser. Please visit: $urlString');
        }
      }
    } catch (_) {
      if (context.mounted) {
        _showError(context, 'Could not open browser. Please visit: $urlString');
      }
    }
  }

  static void _showError(BuildContext context, String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: AppColors.cta,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.sm)),
      ),
    );
  }

  static Future<void> openTerms(BuildContext context) =>
      openUrl(context, AppConstants.termsUrl);

  static Future<void> openPrivacy(BuildContext context) =>
      openUrl(context, AppConstants.privacyUrl);

  static Future<void> openDeleteAccount(BuildContext context) =>
      openUrl(context, AppConstants.deleteAccountUrl);
}

/// Renders a tappable consent notice:
/// "By continuing you agree to our Terms & Conditions and Privacy Policy"
class LegalConsentText extends StatefulWidget {
  const LegalConsentText({
    super.key,
    this.prefix = 'By continuing you agree to our ',
    this.linkColor = AppColors.cta,
    this.textColor = AppColors.ink500,
    this.fontSize = 11.5,
    this.textAlign = TextAlign.center,
  });

  final String prefix;
  final Color linkColor;
  final Color textColor;
  final double fontSize;
  final TextAlign textAlign;

  @override
  State<LegalConsentText> createState() => _LegalConsentTextState();
}

class _LegalConsentTextState extends State<LegalConsentText> {
  late final TapGestureRecognizer _termsRecognizer;
  late final TapGestureRecognizer _privacyRecognizer;

  @override
  void initState() {
    super.initState();
    _termsRecognizer = TapGestureRecognizer()
      ..onTap = () => LegalUtils.openTerms(context);
    _privacyRecognizer = TapGestureRecognizer()
      ..onTap = () => LegalUtils.openPrivacy(context);
  }

  @override
  void dispose() {
    _termsRecognizer.dispose();
    _privacyRecognizer.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Text.rich(
      TextSpan(
        style: TextStyle(
          fontSize: widget.fontSize,
          color: widget.textColor,
          height: 1.4,
        ),
        children: [
          TextSpan(text: widget.prefix),
          TextSpan(
            text: 'Terms & Conditions',
            style: TextStyle(
              color: widget.linkColor,
              fontWeight: FontWeight.w700,
              decoration: TextDecoration.underline,
              decorationColor: widget.linkColor.withValues(alpha: 0.5),
            ),
            recognizer: _termsRecognizer,
          ),
          const TextSpan(text: ' and '),
          TextSpan(
            text: 'Privacy Policy',
            style: TextStyle(
              color: widget.linkColor,
              fontWeight: FontWeight.w700,
              decoration: TextDecoration.underline,
              decorationColor: widget.linkColor.withValues(alpha: 0.5),
            ),
            recognizer: _privacyRecognizer,
          ),
          const TextSpan(text: '.'),
        ],
      ),
      textAlign: widget.textAlign,
    );
  }
}
