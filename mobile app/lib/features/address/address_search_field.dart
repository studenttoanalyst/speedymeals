import 'package:flutter/material.dart';
import 'package:google_places_flutter/google_places_flutter.dart';
import 'package:google_places_flutter/model/place_type.dart';
import 'package:google_places_flutter/model/prediction.dart';

import '../../constants/colors.dart';
import 'selected_location.dart';

/// Reusable Google Places autocomplete search field for Phase M2.
///
/// Wraps [GooglePlaceAutoCompleteTextField] from the `google_places_flutter`
/// package. Requires [PLACES_API_KEY] to be supplied at build time via
/// `--dart-define=PLACES_API_KEY=AIza...`
///
/// Behaviour:
/// - Empty key → non-interactive "Map services are not configured yet." label.
/// - Debounce: 800 ms (package default).
/// - Requests lat/lng with each Place Details call (`isLatLngRequired: true`).
/// - On place selection, calls [onLocationSelected] with the resolved
///   [SelectedLocation].
/// - Network / API failures are surfaced inline; the field remains editable.
/// - No API key is ever logged or printed.
///
/// Session tokens: `google_places_flutter` calls the Places Web API
/// (Autocomplete + Place Details) directly. The package does not expose
/// session-token parameters; explicit session-token control is deferred to
/// a later phase. See `maps-status.md` for full documentation.
class AddressSearchField extends StatefulWidget {
  /// Called when the user selects a place from the suggestion list.
  /// The [SelectedLocation] always contains lat/lng; address and placeId
  /// are populated from the Places API response.
  final void Function(SelectedLocation location) onLocationSelected;

  /// Optional initial text to pre-fill the search field.
  final String? initialText;

  /// Input field hint text.
  final String hintText;

  /// Text style for the input field.
  final TextStyle? inputTextStyle;

  const AddressSearchField({
    super.key,
    required this.onLocationSelected,
    this.initialText,
    this.hintText = 'Search for an address…',
    this.inputTextStyle,
  });

  @override
  State<AddressSearchField> createState() => _AddressSearchFieldState();
}

class _AddressSearchFieldState extends State<AddressSearchField> {
  /// Compile-time Places API key. Empty string when not configured.
  /// Injected via `--dart-define=PLACES_API_KEY=AIza...`
  static const _placesApiKey =
      String.fromEnvironment('PLACES_API_KEY', defaultValue: '');

  final TextEditingController _controller = TextEditingController();

  @override
  void initState() {
    super.initState();
    if (widget.initialText != null) {
      _controller.text = widget.initialText!;
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  /// Clears the text field programmatically.
  void clear() {
    _controller.clear();
  }

  @override
  Widget build(BuildContext context) {
    // No API key configured — render a safe developer-facing placeholder.
    if (_placesApiKey.isEmpty) {
      return _UnconfiguredPlaceholder(hintText: widget.hintText);
    }

    return GooglePlaceAutoCompleteTextField(
      textEditingController: _controller,
      googleAPIKey: _placesApiKey,
      inputDecoration: InputDecoration(
        hintText: widget.hintText,
        hintStyle: const TextStyle(
          color: SpeedyMealsColors.onSurfaceVariant,
          fontSize: 14,
        ),
        prefixIcon: const Icon(
          Icons.search_rounded,
          color: SpeedyMealsColors.onSurfaceVariant,
          size: 20,
        ),
        suffixIcon: AnimatedBuilder(
          animation: _controller,
          builder: (context, _) => _controller.text.isNotEmpty
              ? IconButton(
                  icon: const Icon(Icons.close_rounded, size: 18),
                  color: SpeedyMealsColors.onSurfaceVariant,
                  onPressed: () {
                    _controller.clear();
                    setState(() {});
                  },
                )
              : const SizedBox.shrink(),
        ),
        filled: true,
        fillColor: SpeedyMealsColors.surfaceContainerLow,
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(
            color: SpeedyMealsColors.outlineVariant,
            width: 1,
          ),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(
            color: SpeedyMealsColors.secondary,
            width: 1.5,
          ),
        ),
      ),
      textStyle: widget.inputTextStyle ??
          const TextStyle(
            fontSize: 14,
            color: SpeedyMealsColors.onSurface,
          ),
      // Debounce prevents a request on every keystroke.
      debounceTime: 800,
      // Requests lat/lng alongside place description.
      isLatLngRequired: true,
      // Countries can be narrowed later (e.g. ['pk'] for Pakistan).
      // Left null for M2 to allow global searches.
      countries: null,
      // Called when the user taps a suggestion in the dropdown.
      itemClick: (Prediction prediction) {
        final desc = prediction.description ?? '';
        _controller
          ..text = desc
          ..selection = TextSelection.fromPosition(
            TextPosition(offset: desc.length),
          );
      },
      // Called after lat/lng is resolved for the selected place.
      // This is the primary callback — creates the SelectedLocation.
      getPlaceDetailWithLatLng: (Prediction prediction) {
        final latStr = prediction.lat;
        final lngStr = prediction.lng;

        if (latStr == null || lngStr == null) return;

        final lat = double.tryParse(latStr);
        final lng = double.tryParse(lngStr);

        if (lat == null || lng == null) return;

        // Guard against impossible coordinates.
        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return;

        final location = SelectedLocation(
          latitude: lat,
          longitude: lng,
          address: prediction.description,
          placeId: prediction.placeId,
        );

        widget.onLocationSelected(location);
      },
      // Custom list item builder — consistent with app design system.
      itemBuilder: (context, index, Prediction prediction) {
        return Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          child: Row(
            children: [
              const Icon(
                Icons.location_on_outlined,
                size: 18,
                color: SpeedyMealsColors.secondary,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  prediction.description ?? '',
                  style: const TextStyle(
                    fontSize: 13,
                    color: SpeedyMealsColors.onSurface,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
        );
      },
      seperatedBuilder: const Divider(
        height: 1,
        thickness: 1,
        indent: 44,
        color: SpeedyMealsColors.outlineVariant,
      ),
      isCrossBtnShown: false, // We handle the clear button ourselves above.
      containerHorizontalPadding: 0,
      placeType: PlaceType.address,
      keyboardType: TextInputType.streetAddress,
    );
  }
}

/// Shown when [PLACES_API_KEY] is not configured at build time.
///
/// The widget is non-interactive and clearly signals to developers that
/// map services require a key, without leaking any internal error details
/// to end-users.
class _UnconfiguredPlaceholder extends StatelessWidget {
  final String hintText;

  const _UnconfiguredPlaceholder({required this.hintText});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: SpeedyMealsColors.surfaceContainerLow,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: SpeedyMealsColors.outlineVariant),
      ),
      child: Row(
        children: [
          const Icon(
            Icons.search_rounded,
            color: SpeedyMealsColors.onSurfaceVariant,
            size: 20,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              'Map services are not configured yet.',
              style: const TextStyle(
                fontSize: 13,
                color: SpeedyMealsColors.onSurfaceVariant,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
