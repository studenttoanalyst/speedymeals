import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';

import '../../core/network/api_exception.dart';
import '../../data/models/user_models.dart';
import '../../data/repositories/user_repository.dart';
import '../../features/address/address.dart';

/// Manage the customer's saved delivery addresses
/// (`GET/POST/PUT/DELETE /users/me/addresses`).
///
/// Addresses matter beyond convenience: `GET /restaurants` derives distance
/// from a saved address and returns 400 when there is none, so without one the
/// customer cannot browse a single restaurant.
///
/// Coordinates are mandatory on the backend, so the add flow either reads the
/// device GPS or accepts typed coordinates — it never fabricates a location.
class SavedAddressesScreen extends StatefulWidget {
  const SavedAddressesScreen({super.key});

  @override
  State<SavedAddressesScreen> createState() => _SavedAddressesScreenState();
}

class _SavedAddressesScreenState extends State<SavedAddressesScreen> {
  static const Color _brandRed = Color(0xFFDC2626);

  final UserRepository _userRepository = UserRepository();

  List<UserAddress> _addresses = const [];
  bool _isLoading = true;
  ApiException? _error;

  /// Id of the address whose action (delete/default) is in flight.
  String? _busyAddressId;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final addresses = await _userRepository.listAddresses();
      if (!mounted) return;
      setState(() {
        _addresses = addresses;
        _isLoading = false;
      });
    } on ApiException catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error;
        _isLoading = false;
      });
    }
  }

  Future<void> _setDefault(UserAddress address) async {
    if (_busyAddressId != null) return;
    setState(() => _busyAddressId = address.id);
    try {
      await _userRepository.updateAddress(address.id, isDefault: true);
      await _load();
    } on ApiException catch (error) {
      _showError(error.message);
    } finally {
      if (mounted) setState(() => _busyAddressId = null);
    }
  }

  Future<void> _delete(UserAddress address) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Remove address?'),
        content: Text(address.displaySubtitle),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            style: FilledButton.styleFrom(backgroundColor: _brandRed),
            child: const Text('Remove'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;

    setState(() => _busyAddressId = address.id);
    try {
      await _userRepository.deleteAddress(address.id);
      await _load();
    } on ApiException catch (error) {
      _showError(error.message);
    } finally {
      if (mounted) setState(() => _busyAddressId = null);
    }
  }

  Future<void> _addAddress() async {
    final draft = await showModalBottomSheet<_AddressDraft>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Theme.of(context).colorScheme.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) => const _AddAddressSheet(),
    );
    if (draft == null || !mounted) return;

    setState(() => _busyAddressId = 'new');
    try {
      await _userRepository.createAddress(
        latitude: draft.latitude,
        longitude: draft.longitude,
        label: draft.label,
        fullAddress: draft.fullAddress,
        // First address should become the default one automatically.
        isDefault: _addresses.isEmpty,
      );
      await _load();
    } on ApiException catch (error) {
      _showError(error.message);
    } finally {
      if (mounted) setState(() => _busyAddressId = null);
    }
  }

  void _showError(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
      ..clearSnackBars()
      ..showSnackBar(
        SnackBar(
          content: Text(message),
          backgroundColor: _brandRed,
          behavior: SnackBarBehavior.floating,
        ),
      );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: theme.colorScheme.surface,
      appBar: AppBar(
        backgroundColor: theme.colorScheme.surface,
        elevation: 0,
        title: const Text('Saved Addresses'),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _busyAddressId == null ? _addAddress : null,
        backgroundColor: _brandRed,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add_location_alt_outlined),
        label: const Text('Add address'),
      ),
      body: SafeArea(child: _buildBody(theme)),
    );
  }

  Widget _buildBody(ThemeData theme) {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    final failure = _error;
    if (failure != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.error_outline_rounded, size: 52, color: theme.colorScheme.error),
              const SizedBox(height: 16),
              Text(
                'Could not load your addresses',
                style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                failure.message,
                style: theme.textTheme.bodyMedium
                    ?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 20),
              FilledButton.icon(
                onPressed: _load,
                icon: const Icon(Icons.refresh_rounded, size: 18),
                label: const Text('Try again'),
              ),
            ],
          ),
        ),
      );
    }

    if (_addresses.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 96,
                height: 96,
                decoration: BoxDecoration(
                  color: theme.colorScheme.surfaceContainerHigh,
                  shape: BoxShape.circle,
                ),
                child: Icon(Icons.location_off_outlined, size: 44, color: theme.colorScheme.primary),
              ),
              const SizedBox(height: 20),
              Text(
                'No saved addresses',
                style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              Text(
                'Add a delivery address to start browsing restaurants near you.',
                style: theme.textTheme.bodyMedium
                    ?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.separated(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
        itemCount: _addresses.length,
        separatorBuilder: (context, index) => const SizedBox(height: 10),
        itemBuilder: (context, index) {
          final address = _addresses[index];
          return _AddressTile(
            address: address,
            isBusy: _busyAddressId == address.id,
            onSetDefault: () => _setDefault(address),
            onDelete: () => _delete(address),
          );
        },
      ),
    );
  }
}

class _AddressTile extends StatelessWidget {
  const _AddressTile({
    required this.address,
    required this.isBusy,
    required this.onSetDefault,
    required this.onDelete,
  });

  final UserAddress address;
  final bool isBusy;
  final VoidCallback onSetDefault;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(
                color: theme.colorScheme.primaryContainer.withValues(alpha: 0.5),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(Icons.location_on_rounded, color: theme.colorScheme.primary),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Flexible(
                        child: Text(
                          address.displayTitle,
                          style: theme.textTheme.titleMedium
                              ?.copyWith(fontWeight: FontWeight.bold),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      if (address.isDefault) ...[
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: const Color(0xFF10B981),
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: const Text(
                            'Default',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    address.displaySubtitle,
                    style: theme.textTheme.bodySmall
                        ?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      if (!address.isDefault)
                        TextButton(
                          onPressed: isBusy ? null : onSetDefault,
                          child: const Text('Set as default'),
                        ),
                      const Spacer(),
                      TextButton(
                        onPressed: isBusy ? null : onDelete,
                        style: TextButton.styleFrom(foregroundColor: theme.colorScheme.error),
                        child: const Text('Remove'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            if (isBusy)
              const Padding(
                padding: EdgeInsets.only(left: 8, top: 4),
                child: SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

/// What the add-address sheet returns.
class _AddressDraft {
  const _AddressDraft({
    required this.latitude,
    required this.longitude,
    this.label,
    this.fullAddress,
  });

  final double latitude;
  final double longitude;
  final String? label;
  final String? fullAddress;
}

/// Bottom sheet that collects a new address, including real coordinates.
class _AddAddressSheet extends StatefulWidget {
  const _AddAddressSheet();

  @override
  State<_AddAddressSheet> createState() => _AddAddressSheetState();
}

class _AddAddressSheetState extends State<_AddAddressSheet> {
  static const Color _brandRed = Color(0xFFDC2626);

  final _formKey = GlobalKey<FormState>();
  final _labelController = TextEditingController();
  final _addressController = TextEditingController();
  final _latController = TextEditingController();
  final _lngController = TextEditingController();

  bool _isLocating = false;
  String? _locationError;

  @override
  void dispose() {
    _labelController.dispose();
    _addressController.dispose();
    _latController.dispose();
    _lngController.dispose();
    super.dispose();
  }

  Future<void> _pickOnMap() async {
    final location = await Navigator.of(context).push<SelectedLocation>(
      MaterialPageRoute(
        builder: (context) => const LocationPickerScreen(),
      ),
    );
    if (location == null || !mounted) return;

    setState(() {
      _latController.text = location.latitude.toStringAsFixed(6);
      _lngController.text = location.longitude.toStringAsFixed(6);
      if (location.address != null && location.address!.trim().isNotEmpty) {
        _addressController.text = location.address!.trim();
      }
      _locationError = null;
    });
  }

  /// Reads the device GPS and fills the coordinate fields.
  ///
  /// Every failure mode (permission denied, denied forever, GPS disabled,
  /// timeout) is surfaced as plain text rather than a silent failure, and the
  /// user can always type coordinates instead.
  Future<void> _useCurrentLocation() async {
    if (_isLocating) return;
    setState(() {
      _isLocating = true;
      _locationError = null;
    });

    try {
      final serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        throw Exception('Location services are turned off. Enable GPS and try again.');
      }

      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied) {
        throw Exception('Location permission was denied.');
      }
      if (permission == LocationPermission.deniedForever) {
        throw Exception(
          'Location permission is permanently denied. Enable it in system settings, '
          'or enter the coordinates manually.',
        );
      }

      final position = await Geolocator.getCurrentPosition();
      if (!mounted) return;
      setState(() {
        _latController.text = position.latitude.toStringAsFixed(6);
        _lngController.text = position.longitude.toStringAsFixed(6);
      });
    } catch (error) {
      if (!mounted) return;
      setState(() => _locationError = error.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _isLocating = false);
    }
  }

  void _submit() {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    final latitude = double.parse(_latController.text.trim());
    final longitude = double.parse(_lngController.text.trim());

    Navigator.of(context).pop(
      _AddressDraft(
        latitude: latitude,
        longitude: longitude,
        label: _labelController.text.trim().isEmpty
            ? null
            : _labelController.text.trim(),
        fullAddress: _addressController.text.trim().isEmpty
            ? null
            : _addressController.text.trim(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return Padding(
      padding: EdgeInsets.fromLTRB(20, 20, 20, 20 + bottomInset),
      child: SingleChildScrollView(
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'Add a delivery address',
                style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _labelController,
                textCapitalization: TextCapitalization.words,
                decoration: const InputDecoration(
                  labelText: 'Label (optional)',
                  hintText: 'Home, Office…',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _addressController,
                textCapitalization: TextCapitalization.sentences,
                maxLines: 2,
                decoration: const InputDecoration(
                  labelText: 'Address (optional)',
                  hintText: 'Street, block, area',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _pickOnMap,
                      icon: const Icon(Icons.map_outlined, size: 18),
                      label: const Text('Pick on Map'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _isLocating ? null : _useCurrentLocation,
                      icon: _isLocating
                          ? const SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Icon(Icons.my_location_rounded, size: 18),
                      label: const Text('Current location'),
                    ),
                  ),
                ],
              ),
              if (_locationError != null) ...[
                const SizedBox(height: 8),
                Text(
                  _locationError!,
                  style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.error),
                ),
              ],
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _latController,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true, signed: true),
                      decoration: const InputDecoration(
                        labelText: 'Latitude',
                        border: OutlineInputBorder(),
                      ),
                      validator: _validateLatitude,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextFormField(
                      controller: _lngController,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true, signed: true),
                      decoration: const InputDecoration(
                        labelText: 'Longitude',
                        border: OutlineInputBorder(),
                      ),
                      validator: _validateLongitude,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                'Coordinates are required — the delivery fee and nearby '
                'restaurants are calculated from them.',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
              const SizedBox(height: 20),
              SizedBox(
                height: 50,
                child: FilledButton(
                  onPressed: _submit,
                  style: FilledButton.styleFrom(
                    backgroundColor: _brandRed,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                  child: const Text(
                    'Save address',
                    style: TextStyle(fontWeight: FontWeight.w700),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  String? _validateLatitude(String? value) {
    final parsed = double.tryParse((value ?? '').trim());
    if (parsed == null) return 'Enter a number';
    if (parsed < -90 || parsed > 90) return 'Must be -90 to 90';
    return null;
  }

  String? _validateLongitude(String? value) {
    final parsed = double.tryParse((value ?? '').trim());
    if (parsed == null) return 'Enter a number';
    if (parsed < -180 || parsed > 180) return 'Must be -180 to 180';
    return null;
  }
}
