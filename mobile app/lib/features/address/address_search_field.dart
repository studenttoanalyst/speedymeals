import 'dart:async';

import 'package:flutter/material.dart';

import '../../constants/colors.dart';
import '../../core/network/api_exception.dart';
import '../../data/models/location_models.dart';
import '../../data/repositories/location_repository.dart';
import 'selected_location.dart';

/// Reusable address autocomplete search field for Phase M2.
///
/// Talks to the backend's Google Maps proxy through [LocationRepository]
/// (`GET /api/v1/location/places/autocomplete` and `.../places/details`), so the
/// server's Google key never ships in the app and no client-side
/// `PLACES_API_KEY` is required.
///
/// Behaviour:
/// - Debounce: 350 ms after the last keystroke.
/// - Minimum query length: 3 characters (shorter input clears the list).
/// - On place selection, resolves coordinates via Place Details and calls
///   [onLocationSelected] with the resolved [SelectedLocation].
/// - Network / API failures are surfaced inline; the field remains editable.
/// - No secret or API key is ever logged or printed.
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

  /// Optional injected backend location client (tests pass a fake).
  final LocationRepository? locationRepository;

  const AddressSearchField({
    super.key,
    required this.onLocationSelected,
    this.initialText,
    this.hintText = 'Search for an address…',
    this.inputTextStyle,
    this.locationRepository,
  });

  @override
  State<AddressSearchField> createState() => _AddressSearchFieldState();
}

class _AddressSearchFieldState extends State<AddressSearchField> {
  /// Delay after the last keystroke before an autocomplete request is sent.
  static const Duration _debounce = Duration(milliseconds: 350);

  /// Autocomplete is not requested until the query is at least this long.
  static const int _minQueryLength = 3;

  late final LocationRepository _repository;
  final TextEditingController _controller = TextEditingController();

  Timer? _debounceTimer;

  List<PlacePrediction> _suggestions = const [];
  bool _isLoading = false;
  String? _error;

  /// Guards against a slow earlier request overwriting a newer one's result.
  int _requestSeq = 0;

  @override
  void initState() {
    super.initState();
    _repository = widget.locationRepository ?? LocationRepository();
    if (widget.initialText != null) {
      _controller.text = widget.initialText!;
    }
    _controller.addListener(_onQueryChanged);
  }

  @override
  void dispose() {
    _debounceTimer?.cancel();
    _controller.removeListener(_onQueryChanged);
    _controller.dispose();
    super.dispose();
  }

  /// Clears the text field programmatically.
  void clear() {
    _controller.clear();
  }

  // ─────────────────────────────── autocomplete ──────────────────────────────

  void _onQueryChanged() {
    final query = _controller.text.trim();
    _debounceTimer?.cancel();

    if (query.length < _minQueryLength) {
      if (_suggestions.isNotEmpty || _error != null || _isLoading) {
        setState(() {
          _suggestions = const [];
          _error = null;
          _isLoading = false;
        });
      }
      return;
    }

    // Drop the previous result set so a stale list never lingers under a
    // changed query.
    setState(() {
      _suggestions = const [];
      _error = null;
    });
    _debounceTimer = Timer(_debounce, () => _fetchSuggestions(query));
  }

  Future<void> _fetchSuggestions(String query) async {
    if (!mounted) return;
    final seq = ++_requestSeq;
    setState(() => _isLoading = true);

    try {
      final results = await _repository.autocompletePlaces(query);
      if (!mounted || seq != _requestSeq) return;
      setState(() {
        _suggestions = results;
        _isLoading = false;
      });
    } on ApiException catch (error) {
      if (!mounted || seq != _requestSeq) return;
      setState(() {
        _suggestions = const [];
        _error = error.message;
        _isLoading = false;
      });
    } catch (_) {
      if (!mounted || seq != _requestSeq) return;
      setState(() {
        _suggestions = const [];
        _error = 'Could not load suggestions. Please try again.';
        _isLoading = false;
      });
    }
  }

  /// Resolves a tapped suggestion to coordinates via Place Details, then hands
  /// the parent a complete [SelectedLocation].
  Future<void> _selectPrediction(PlacePrediction prediction) async {
    _debounceTimer?.cancel();
    final description = prediction.description;

    _controller
      ..text = description
      ..selection = TextSelection.fromPosition(
        TextPosition(offset: description.length),
      );

    setState(() {
      _suggestions = const [];
      _error = null;
      _isLoading = true;
    });

    try {
      final details = await _repository.placeDetails(prediction.placeId);
      if (!mounted) return;

      if (details == null ||
          !_isValidCoordinate(details.latitude, details.longitude)) {
        setState(() {
          _isLoading = false;
          _error = 'Could not resolve that address. Please try another.';
        });
        return;
      }

      setState(() => _isLoading = false);
      FocusScope.of(context).unfocus();

      widget.onLocationSelected(
        SelectedLocation(
          latitude: details.latitude,
          longitude: details.longitude,
          address: details.formattedAddress.isNotEmpty
              ? details.formattedAddress
              : description,
          placeId:
              details.placeId.isNotEmpty ? details.placeId : prediction.placeId,
        ),
      );
    } on ApiException catch (error) {
      if (!mounted) return;
      setState(() {
        _isLoading = false;
        _error = error.message;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _isLoading = false;
        _error = 'Could not resolve that address. Please try another.';
      });
    }
  }

  /// Rejects NaN/∞/out-of-bounds coordinates so a bad response never becomes a
  /// selected location.
  static bool _isValidCoordinate(double lat, double lng) {
    if (lat.isNaN || lng.isNaN || lat.isInfinite || lng.isInfinite) {
      return false;
    }
    return lat >= -90.0 && lat <= 90.0 && lng >= -180.0 && lng <= 180.0;
  }

  // ───────────────────────────────── build ──────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        TextField(
          controller: _controller,
          style: widget.inputTextStyle ??
              const TextStyle(
                fontSize: 14,
                color: SpeedyMealsColors.onSurface,
              ),
          keyboardType: TextInputType.streetAddress,
          decoration: InputDecoration(
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
        ),
        if (_isLoading || _suggestions.isNotEmpty || _error != null)
          _buildSuggestionsCard(),
      ],
    );
  }

  Widget _buildSuggestionsCard() {
    return Container(
      margin: const EdgeInsets.only(top: 4),
      decoration: BoxDecoration(
        color: SpeedyMealsColors.surfaceContainerLow,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.12),
            blurRadius: 8,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: _isLoading
          ? const Padding(
              padding: EdgeInsets.symmetric(vertical: 14),
              child: Center(
                child: SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
              ),
            )
          : _error != null
              ? Padding(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  child: Row(
                    children: [
                      const Icon(
                        Icons.error_outline_rounded,
                        size: 16,
                        color: SpeedyMealsColors.error,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          _error!,
                          style: const TextStyle(
                            fontSize: 12,
                            color: SpeedyMealsColors.onSurfaceVariant,
                          ),
                        ),
                      ),
                    ],
                  ),
                )
              : Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    for (var i = 0; i < _suggestions.length; i++) ...[
                      if (i > 0)
                        const Divider(
                          height: 1,
                          thickness: 1,
                          indent: 44,
                          color: SpeedyMealsColors.outlineVariant,
                        ),
                      _SuggestionTile(
                        prediction: _suggestions[i],
                        onTap: () => _selectPrediction(_suggestions[i]),
                      ),
                    ],
                  ],
                ),
    );
  }
}

/// One autocomplete suggestion row — matches the app's list-item design.
class _SuggestionTile extends StatelessWidget {
  final PlacePrediction prediction;
  final VoidCallback onTap;

  const _SuggestionTile({required this.prediction, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Padding(
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
                prediction.description,
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
      ),
    );
  }
}
