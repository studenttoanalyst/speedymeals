import 'package:flutter/material.dart';

/// Muted one-line note for tax that is already inside the food subtotal.
///
/// Shown only when the backend reports `prices_include_gst == true`: the tax is
/// part of the food price, so it must be disclosed as a note rather than added
/// as a row (adding it would double-count against the backend's `total`).
/// The text is always built from backend values — never computed here.
class GstNote extends StatelessWidget {
  const GstNote({super.key, required this.text, this.color});

  final String text;

  /// Overrides the label colour (used by the dark tracking receipt).
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final resolved = color ?? theme.colorScheme.onSurfaceVariant;

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(Icons.info_outline_rounded, size: 13, color: resolved),
        const SizedBox(width: 5),
        Expanded(
          child: Text(
            text,
            style: theme.textTheme.bodySmall?.copyWith(
              color: resolved,
              fontStyle: FontStyle.italic,
            ),
          ),
        ),
      ],
    );
  }
}
