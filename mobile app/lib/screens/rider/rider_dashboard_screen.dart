import 'dart:async';

import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';

import '../../core/network/api_exception.dart';
import '../../data/models/rider_models.dart';
import '../../data/repositories/rider_repository.dart';
import '../../services/auth_service.dart';
import '../auth/register_as_screen.dart';
import 'rider_documents_screen.dart';
import 'rider_wallet_screen.dart';
import '../../features/maps/maps.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

/// Delivery Rider dashboard — the rider's real workspace.
///
/// Backed entirely by the rider endpoints:
///   GET  /wallet/profile                  → approval state, wallet, docs
///   GET  /wallet/assignments              → the rider's job board
///   PATCH /wallet/status                  → go online/offline (Rs. 500 floor)
///   PATCH /wallet/location                → push GPS (required to be assignable)
///   POST /wallet/assignments/{id}/respond → accept / reject
///   PATCH /wallet/deliveries/{id}/status/… → arrived → picked up → on the way → delivered
///
/// `approval_status` is enforced by the BACKEND on accept/deliver; this screen
/// reflects the same state so an unapproved rider is told why, never left
/// guessing. Nothing shown here is fabricated — every number comes from the
/// server.
class RiderDashboardScreen extends StatefulWidget {
  final RiderNavigationService navigationService;
  final RiderLocationService? locationService;
  final RiderLocationPublisher? locationPublisher;
  final RiderRepository? repository;

  const RiderDashboardScreen({
    super.key,
    this.navigationService = const RiderNavigationService(),
    this.locationService,
    this.locationPublisher,
    this.repository,
  });

  @override
  State<RiderDashboardScreen> createState() => _RiderDashboardScreenState();
}

class _RiderDashboardScreenState extends State<RiderDashboardScreen> {
  static const Color _bg = Color(0xFF0F172A);
  static const Color _card = Color(0xFF1E293B);
  static const Color _border = Color(0xFF334155);
  static const Color _green = Color(0xFF10B981);
  static const Color _red = Color(0xFFDC2626);

  late final RiderRepository _repository;

  RiderProfile? _profile;
  List<RiderAssignment> _assignments = const [];
  RiderWallet? _wallet;
  LatLng? _currentRiderLocation;

  bool _isLoading = true;
  ApiException? _error;

  /// Order id whose accept/reject/status call is currently in flight.
  String? _busyOrderId;

  bool _isTogglingOnline = false;

  /// While online, the rider's location is re-pushed periodically so the
  /// backend's ~45s Redis TTL never lapses and they stay assignable.
  Timer? _locationTimer;

  // ── M5: GPS tracking ──────────────────────────────────────────────────────

  /// Reusable GPS service — holds the raw geolocator stream.
  late final RiderLocationService _locationService;

  /// Throttled publisher — sends PATCH /wallet/location only when needed.
  late final RiderLocationPublisher _locationPublisher;
  bool _ownsPublisher = false;

  /// Current location status string shown in the UI chip.
  /// One of: 'Location sharing active', 'Location permission required',
  /// 'Turn on location services', 'Location will sync when connection returns', or ''.
  String _locationStatus = '';

  /// True once active-delivery tracking has been started via the publisher.
  bool _activeTrackingRunning = false;

  /// Subscription to the live position stream for map marker updates.
  StreamSubscription<Position>? _positionMarkerSub;

  @override
  void initState() {
    super.initState();
    _repository = widget.repository ?? RiderRepository();
    _locationService = widget.locationService ?? RiderLocationService();
    if (widget.locationPublisher != null) {
      _locationPublisher = widget.locationPublisher!;
      _ownsPublisher = false;
    } else {
      _locationPublisher = RiderLocationPublisher(
        locationService: _locationService,
        repository: _repository,
      );
      _ownsPublisher = true;
    }
    _load();
  }

  @override
  void dispose() {
    _locationTimer?.cancel();
    _positionMarkerSub?.cancel();
    _positionMarkerSub = null;
    _locationPublisher.stop();
    if (_ownsPublisher) {
      _locationPublisher.dispose();
    }
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final profile = await _repository.profile();
      final assignments = await _repository.assignments();
      // Uses /wallet/earnings, not /wallet/balance: only the earnings endpoint
      // returns `earnings_balance`, so the EARNINGS card would otherwise show
      // the wallet balance twice.
      final wallet = await _repository.earnings();
      if (!mounted) return;
      setState(() {
        _profile = profile;
        _assignments = assignments;
        _wallet = wallet;
        _isLoading = false;
      });
      _syncLocationTimer();
      // M5: sync active-delivery GPS stream whenever data reloads.
      await _syncActiveDeliveryTracking();

    } on ApiException catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error;
        _isLoading = false;
      });
    }
  }

  bool get _isApproved => _profile?.canWork ?? false;

  /// Keeps the periodic location push running only while online + approved.
  void _syncLocationTimer() {
    final shouldPush = _isApproved && (_profile?.isOnline ?? false);
    if (shouldPush && _locationTimer == null) {
      _locationTimer = Timer.periodic(
        const Duration(seconds: 40),
        (_) => _pushLocation(silent: true),
      );
    } else if (!shouldPush) {
      _locationTimer?.cancel();
      _locationTimer = null;
    }
  }

  // ── M5: active-delivery GPS stream ────────────────────────────────────────

  /// Returns true when the rider has at least one assignment that is currently
  /// in progress (accepted, at restaurant, picked up, on the way).
  bool get _hasActiveDelivery =>
      _assignments.any((a) => a.isInProgress);

  /// Starts the continuous GPS publisher when the rider has an active delivery,
  /// stops it when they do not.
  ///
  /// Called after every [_load] and assignment state change so the tracking
  /// condition is always up to date.
  Future<void> _syncActiveDeliveryTracking() async {
    if (!mounted) return;

    if (_hasActiveDelivery && _isApproved && (_profile?.isOnline ?? false)) {
      if (!_activeTrackingRunning) {
        final result = await _locationPublisher.start();
        _activeTrackingRunning = result.isGranted;

        await _positionMarkerSub?.cancel();
        _positionMarkerSub = _locationService.positionStream.listen(
          _onLivePosition,
          cancelOnError: false,
        );

        if (mounted) {
          setState(() {
            _locationStatus = result.message;
          });
        }
      }
    } else {
      if (_activeTrackingRunning) {
        await _positionMarkerSub?.cancel();
        _positionMarkerSub = null;
        await _locationPublisher.stop();
        _activeTrackingRunning = false;
        if (mounted) {
          setState(() {
            _locationStatus = '';
          });
        }
      }
    }
  }

  /// Called for every validated position from the live stream.
  ///
  /// Updates [_currentRiderLocation] which feeds the rider map marker.
  /// Does NOT auto-recenter the camera — the rider's manual pan/zoom is preserved.
  void _onLivePosition(Position position) {
    if (!mounted) return;
    if (!RiderLocationService.isValidCoordinate(
        position.latitude, position.longitude)) {
      return;
    }
    setState(() {
      _currentRiderLocation =
          LatLng(position.latitude, position.longitude);
      _locationStatus = 'Location sharing active';
    });
  }

  // ── M5: location status UI helper ─────────────────────────────────────────

  /// Returns the current location status message appropriate for the UI chip.
  String get _resolvedLocationStatus {
    if (_locationStatus.isNotEmpty) return _locationStatus;
    if (_profile?.isOnline ?? false) return 'Location sharing active';
    return '';
  }

  /// Reads the device GPS and sends it to the backend.
  ///
  /// Returns true on success. Every failure mode is handled explicitly: with no
  /// location the backend treats the rider as unavailable, so the UI says so
  /// instead of pretending they are online and reachable.
  Future<bool> _pushLocation({bool silent = false}) async {
    try {
      // M6: this online/TTL path now goes through the single injectable GPS
      // service (instead of calling Geolocator statics directly), so it shares
      // one permission policy and one coordinate-validation guard with the
      // active-delivery publisher. No second GPS read, no unvalidated upload.
      final permission = await _locationService.checkAndRequestPermission();
      if (!permission.isGranted) {
        final serviceDisabled =
            permission.state == LocationPermissionState.serviceDisabled;
        if (!silent) {
          _showError(serviceDisabled
              ? 'Turn on location services so you can receive orders.'
              : 'Location permission is required to receive delivery orders.');
        }
        if (mounted) setState(() => _locationStatus = permission.message);
        return false;
      }

      final position = await _locationService.getCurrentPosition();
      if (position == null) {
        if (!silent) {
          _showError('Could not read a valid GPS position. Please try again.');
        }
        if (mounted) {
          setState(() =>
              _locationStatus = 'Location will sync when connection returns');
        }
        return false;
      }
      final lat = position.latitude;
      final lng = position.longitude;

      // M6: never publish an unusable reading. The active-delivery publisher
      // validates every position; this online/TTL path must apply the same
      // guard so NaN/±Infinity/out-of-bounds values are never sent to
      // `PATCH /wallet/location` or fed to the map marker.
      if (!RiderLocationService.isValidCoordinate(lat, lng)) {
        if (!silent) {
          _showError('Could not read a valid GPS position. Please try again.');
        }
        if (mounted) {
          setState(() =>
              _locationStatus = 'Location will sync when connection returns');
        }
        return false;
      }

      if (mounted) {
        setState(() {
          _currentRiderLocation = LatLng(lat, lng);
          _locationStatus = 'Location sharing active';
        });
      }
      await _repository.updateLocation(
        latitude: lat,
        longitude: lng,
      );
      return true;
    } catch (error) {
      if (!silent) _showError('Could not read your location. Please try again.');
      if (mounted) setState(() => _locationStatus = 'Location will sync when connection returns');
      return false;
    }
  }

  Future<void> _toggleOnline(bool value) async {
    if (_isTogglingOnline) return;
    final profile = _profile;
    if (profile == null) return;

    if (value && !profile.canWork) {
      _showError('Your account is not approved for deliveries yet.');
      return;
    }

    // Going online requires a live location on the backend; asking for it up
    // front gives a clear reason when permission is missing.
    if (value) {
      final located = await _pushLocation();
      if (!located) return;
    }

    setState(() => _isTogglingOnline = true);
    try {
      final wallet = await _repository.setOnline(value);
      if (!mounted) return;
      setState(() {
        _wallet = wallet;
        _profile = profile.copyWith(isOnline: value);
      });
      _syncLocationTimer();
      await _syncActiveDeliveryTracking();
      if (!mounted) return;
      if (value) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('You are online and can receive orders.'),
            backgroundColor: _green,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } on ApiException catch (error) {
      // Going online below the Rs. 500 wallet floor is a 400 with a clear
      // message — surface it verbatim.
      _showError(error.message);
    } finally {
      if (mounted) setState(() => _isTogglingOnline = false);
    }
  }

  Future<void> _respond(RiderAssignment assignment, bool accept) async {
    if (_busyOrderId != null) return;
    setState(() => _busyOrderId = assignment.id);
    try {
      await _repository.respondToAssignment(orderId: assignment.id, accept: accept);
      await _load();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(accept ? 'Delivery accepted.' : 'Delivery declined.'),
          backgroundColor: accept ? _green : _red,
          behavior: SnackBarBehavior.floating,
        ),
      );
    } on ApiException catch (error) {
      _showError(error.message);
    } finally {
      if (mounted) setState(() => _busyOrderId = null);
    }
  }

  Future<void> _advance(RiderAssignment assignment, RiderAction action) async {
    if (_busyOrderId != null) return;
    setState(() => _busyOrderId = assignment.id);
    try {
      await _repository.advanceDeliveryStatus(orderId: assignment.id, action: action);
      await _load();
    } on ApiException catch (error) {
      _showError(error.message);
    } finally {
      if (mounted) setState(() => _busyOrderId = null);
    }
  }

  void _showError(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
      ..clearSnackBars()
      ..showSnackBar(
        SnackBar(
          content: Text(message),
          backgroundColor: _red,
          behavior: SnackBarBehavior.floating,
        ),
      );
  }

  Future<void> _logout() async {
    _locationTimer?.cancel();
    await _positionMarkerSub?.cancel();
    _positionMarkerSub = null;
    await _locationPublisher.stop();
    _activeTrackingRunning = false;
    await AuthService.instance.logout();
    if (!mounted) return;
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (context) => const RegisterAsScreen()),
      (route) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    final online = _profile?.isOnline ?? false;

    return Scaffold(
      backgroundColor: _bg,
      appBar: AppBar(
        backgroundColor: _card,
        elevation: 2,
        automaticallyImplyLeading: false,
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: const BoxDecoration(color: _red, shape: BoxShape.circle),
              child: const Icon(Icons.two_wheeler_rounded, color: Colors.white, size: 20),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Rider Fleet Portal',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Colors.white),
                  ),
                  Text(
                    _profile?.displayName ?? AuthService.instance.currentUser?.displayName ?? 'Rider',
                    style: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 8),
            child: FilterChip(
              selected: online,
              onSelected: _isTogglingOnline ? (_) {} : _toggleOnline,
              avatar: Icon(
                Icons.circle,
                size: 10,
                color: online ? _green : Colors.grey,
              ),
              label: Text(
                _isTogglingOnline ? '...' : (online ? 'ONLINE' : 'OFFLINE'),
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                  color: online ? _green : Colors.white70,
                ),
              ),
              backgroundColor: _bg,
              selectedColor: const Color(0xFF064E3B),
              side: BorderSide(color: online ? _green : Colors.white24),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.account_balance_wallet_outlined, color: Colors.white70),
            tooltip: 'Wallet & earnings',
            onPressed: () async {
              await Navigator.of(context).push(
                MaterialPageRoute(builder: (context) => const RiderWalletScreen()),
              );
              if (mounted) _load();
            },
          ),
          IconButton(
            icon: const Icon(Icons.logout_rounded, color: Colors.white70),
            tooltip: 'Logout',
            onPressed: _logout,
          ),
        ],
      ),
      body: SafeArea(child: _buildBody()),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    final failure = _error;
    if (failure != null && _profile == null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                failure.kind == ApiErrorKind.network ? Icons.wifi_off_rounded : Icons.error_outline_rounded,
                size: 52,
                color: _red,
              ),
              const SizedBox(height: 16),
              const Text(
                'Could not load your dashboard',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                failure.message,
                style: const TextStyle(color: Color(0xFF94A3B8)),
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

    final profile = _profile;
    final online = profile?.isOnline ?? false;

    return RefreshIndicator(
      onRefresh: _load,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (profile != null && !profile.isApproved) _buildApprovalBanner(profile),
            if (profile != null && !profile.hasAllDocuments)
              _buildDocumentsBanner(profile),
            _buildOnlineBanner(online),
            const SizedBox(height: 24),
            const Text(
              'Wallet Summary',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: Colors.white),
            ),
            const SizedBox(height: 12),
            _buildMetrics(),
            const SizedBox(height: 28),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'My Deliveries',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: Colors.white),
                ),
                Text(
                  online ? 'Updated live' : 'Offline',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: online ? _green : const Color(0xFF94A3B8),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            ..._buildAssignmentList(profile),
          ],
        ),
      ),
    );
  }

  Widget _buildApprovalBanner(RiderProfile profile) {
    final isRejected = profile.isRejected;
    final color = isRejected ? _red : const Color(0xFFF59E0B);
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.14),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withValues(alpha: 0.4)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(isRejected ? Icons.cancel_outlined : Icons.hourglass_top_rounded, color: color),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  isRejected ? 'Account not approved' : 'Approval pending',
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  isRejected
                      ? 'Your documents were not approved. Contact support to resolve this.'
                      : 'An administrator is reviewing your documents. You cannot accept deliveries until you are approved.',
                  style: const TextStyle(fontSize: 12.5, color: Color(0xFFCBD5E1), height: 1.4),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDocumentsBanner(RiderProfile profile) {
    return GestureDetector(
      onTap: () async {
        await Navigator.of(context).push(
          MaterialPageRoute(builder: (context) => const RiderDocumentsScreen()),
        );
        if (mounted) _load();
      },
      child: Container(
        width: double.infinity,
        margin: const EdgeInsets.only(bottom: 16),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: const Color(0xFF1E3A8A).withValues(alpha: 0.35),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFF3B82F6).withValues(alpha: 0.4)),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Icon(Icons.upload_file_rounded, color: Color(0xFF60A5FA)),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Documents incomplete',
                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: Colors.white),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${profile.uploadedDocumentCount} of 3 uploaded (CNIC, license, vehicle). '
                    'Tap to upload the remaining documents.',
                    style: const TextStyle(fontSize: 12.5, color: Color(0xFFCBD5E1), height: 1.4),
                  ),
                ],
              ),
            ),
            const Icon(Icons.chevron_right_rounded, color: Color(0xFF60A5FA)),
          ],
        ),
      ),
    );
  }

  Widget _buildOnlineBanner(bool online) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: online
              ? [const Color(0xFF065F46), const Color(0xFF047857)]
              : [_border, _card],
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.2),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          Icon(
            online ? Icons.radar_rounded : Icons.power_settings_new_rounded,
            color: Colors.white,
            size: 32,
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  online ? 'Looking for nearby orders…' : 'You are currently offline',
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.white),
                ),
                const SizedBox(height: 2),
                Text(
                  online
                      ? 'Your location is being shared so orders can be assigned to you'
                      : 'Go online to start receiving delivery assignments',
                  style: const TextStyle(fontSize: 12, color: Colors.white70),
                ),
                if (online && _resolvedLocationStatus.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Container(
                    key: const Key('rider_location_status_indicator'),
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: Colors.black.withValues(alpha: 0.25),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          _resolvedLocationStatus == 'Location sharing active'
                              ? Icons.location_on_rounded
                              : Icons.location_off_rounded,
                          size: 12,
                          color: _resolvedLocationStatus == 'Location sharing active'
                              ? _green
                              : const Color(0xFFF59E0B),
                        ),
                        const SizedBox(width: 5),
                        Text(
                          _resolvedLocationStatus,
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: Colors.white,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMetrics() {
    final wallet = _wallet;
    final completed = _assignments.where((a) => a.isCompleted).length;

    return Column(
      children: [
        Row(
          children: [
            Expanded(
              child: _MetricCard(
                title: 'WALLET BALANCE',
                value: wallet?.walletBalanceLabel ?? '—',
                subtext: 'Min Rs. 500 to go online',
                icon: Icons.account_balance_wallet_rounded,
                accentColor: _green,
                cardColor: _card,
                borderColor: _border,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _MetricCard(
                title: 'EARNINGS',
                value: wallet?.earningsLabel ?? '—',
                subtext: 'Delivery earnings',
                icon: Icons.payments_rounded,
                accentColor: const Color(0xFF3B82F6),
                cardColor: _card,
                borderColor: _border,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _MetricCard(
                title: 'CASH OWED',
                value: wallet?.pendingCashLabel ?? '—',
                subtext: 'Collected COD to submit',
                icon: Icons.point_of_sale_rounded,
                accentColor: const Color(0xFFF59E0B),
                cardColor: _card,
                borderColor: _border,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _MetricCard(
                title: 'RECENT DELIVERIES',
                value: '$completed',
                subtext: 'In your recent history',
                icon: Icons.check_circle_rounded,
                accentColor: const Color(0xFFEC4899),
                cardColor: _card,
                borderColor: _border,
              ),
            ),
          ],
        ),
      ],
    );
  }

  List<Widget> _buildAssignmentList(RiderProfile? profile) {
    if (_assignments.isEmpty) {
      return [
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: _card,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: _border),
          ),
          child: const Column(
            children: [
              Icon(Icons.inbox_rounded, color: Color(0xFF94A3B8), size: 36),
              SizedBox(height: 10),
              Text(
                'No deliveries assigned',
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: Colors.white),
              ),
              SizedBox(height: 4),
              Text(
                'Orders are assigned automatically to the nearest online rider. '
                'Stay online with a valid location to receive them.',
                style: TextStyle(fontSize: 12, color: Color(0xFF94A3B8), height: 1.4),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ];
    }

    return [
      for (final assignment in _assignments)
        Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: _AssignmentCard(
            assignment: assignment,
            isBusy: _busyOrderId == assignment.id,
            canAct: profile?.isApproved ?? false,
            cardColor: _card,
            borderColor: _border,
            accentGreen: _green,
            accentRed: _red,
            onAccept: () => _respond(assignment, true),
            onReject: () => _respond(assignment, false),
            onAdvance: (action) => _advance(assignment, action),
            riderLocation: _currentRiderLocation,
            navigationService: widget.navigationService,
          ),
        ),
    ];
  }
}

class _MetricCard extends StatelessWidget {
  const _MetricCard({
    required this.title,
    required this.value,
    required this.subtext,
    required this.icon,
    required this.accentColor,
    required this.cardColor,
    required this.borderColor,
  });

  final String title;
  final String value;
  final String subtext;
  final IconData icon;
  final Color accentColor;
  final Color cardColor;
  final Color borderColor;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: cardColor,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: borderColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF94A3B8),
                    letterSpacing: 0.8,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              Icon(icon, color: accentColor, size: 18),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            value,
            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: Colors.white),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 2),
          Text(
            subtext,
            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: accentColor),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}

/// One job on the rider's board, with the correct next action for its status.
class _AssignmentCard extends StatelessWidget {
  const _AssignmentCard({
    required this.assignment,
    required this.isBusy,
    required this.canAct,
    required this.cardColor,
    required this.borderColor,
    required this.accentGreen,
    required this.accentRed,
    required this.onAccept,
    required this.onReject,
    required this.onAdvance,
    this.riderLocation,
    this.navigationService = const RiderNavigationService(),
  });

  final RiderAssignment assignment;
  final bool isBusy;
  final bool canAct;
  final Color cardColor;
  final Color borderColor;
  final Color accentGreen;
  final Color accentRed;
  final VoidCallback onAccept;
  final VoidCallback onReject;
  final void Function(RiderAction action) onAdvance;
  final LatLng? riderLocation;
  final RiderNavigationService navigationService;

  @override
  Widget build(BuildContext context) {
    final address = assignment.deliveryAddress;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: cardColor,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: borderColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: borderColor,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  '#${assignment.shortId}',
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Colors.white),
                ),
              ),
              Text(
                assignment.riderEarningLabel,
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: accentGreen),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              const Icon(Icons.local_shipping_rounded, color: Color(0xFF94A3B8), size: 14),
              const SizedBox(width: 6),
              Text(
                assignment.status.shortLabel,
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFFCBD5E1)),
              ),
              if (assignment.requiresCashCollection) ...[
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF59E0B).withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    'Collect ${assignment.totalLabel}',
                    style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFFF59E0B)),
                  ),
                ),
              ],
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              const Icon(Icons.storefront_rounded, color: Color(0xFFDC2626), size: 16),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  assignment.restaurantName,
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.white),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              const Icon(Icons.location_on_rounded, color: Color(0xFF3B82F6), size: 16),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  address?.displaySubtitle ?? 'Customer address',
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: Color(0xFFCBD5E1)),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          _buildMapPreview(),
          if (assignment.isInProgress) ...[
            const SizedBox(height: 12),
            RiderNavigationSection(
              assignment: assignment,
              navigationService: navigationService,
            ),
          ],
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                assignment.distanceLabel,
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF94A3B8)),
              ),
              if (isBusy)
                const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              else
                _buildActions(),
            ],
          ),
        ],
      ),
    );
  }

  /// Coordinate guard shared by the map-preview pins.
  ///
  /// Mirrors [RiderLocationService.isValidCoordinate] — a pin is only drawn for
  /// coordinates the backend/client actually supplied and that pass the bounds
  /// check. Nothing is derived or offset.
  static bool _isValidCoordinate(double? lat, double? lng) {
    if (lat == null || lng == null) return false;
    if (lat.isNaN || lng.isNaN || lat.isInfinite || lng.isInfinite) return false;
    return lat >= -90.0 && lat <= 90.0 && lng >= -180.0 && lng <= 180.0;
  }

  Widget _buildMapPreview() {
    final address = assignment.deliveryAddress;
    final restaurantLat = assignment.restaurantLatitude;
    final restaurantLng = assignment.restaurantLongitude;
    final customerLat = address?.latitude;
    final customerLng = address?.longitude;

    // Only real coordinates are ever drawn. `GET /wallet/assignments` does not
    // currently return restaurant coordinates or a delivery address, so these
    // are null in practice and no pin is shown — instead of inventing an offset
    // that would look like a real destination. The rider's own marker comes
    // from validated device GPS.
    final hasRestaurant = _isValidCoordinate(restaurantLat, restaurantLng);
    final hasCustomer = _isValidCoordinate(customerLat, customerLng);
    final hasRider = riderLocation != null;

    final markers = <Marker>{
      if (hasRestaurant)
        MapMarkers.restaurant(
          id: assignment.id,
          position: LatLng(restaurantLat!, restaurantLng!),
          name: assignment.restaurantName,
        ),
      if (hasCustomer)
        MapMarkers.customer(
          id: assignment.id,
          position: LatLng(customerLat!, customerLng!),
          title: 'Customer',
          address: address?.displayTitle,
        ),
      if (hasRider)
        MapMarkers.rider(
          id: assignment.id,
          position: riderLocation!,
          riderName: 'You',
        ),
    };

    // Camera target: prefer a real pin, then the rider's own live GPS. Only when
    // nothing real is known does it fall back to the documented M1 default
    // centre (which is never drawn as a marker).
    final initialTarget = hasRestaurant
        ? LatLng(restaurantLat!, restaurantLng!)
        : hasCustomer
            ? LatLng(customerLat!, customerLng!)
            : riderLocation ?? MapView.defaultCoordinates;

    return ClipRRect(
      borderRadius: BorderRadius.circular(12),
      child: SizedBox(
        height: 130,
        width: double.infinity,
        child: MapView(
          initialPosition: initialTarget,
          initialZoom: 13.5,
          markers: markers,
          fitBoundsOnMarkers: false,
          zoomControlsEnabled: false,
          compassEnabled: false,
        ),
      ),
    );
  }

  Widget _buildActions() {
    if (!canAct) {
      return const Text(
        'Approval required',
        style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFFF59E0B)),
      );
    }

    // Waiting for the rider's accept/reject decision.
    if (assignment.needsResponse) {
      return Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          OutlinedButton(
            onPressed: onReject,
            style: OutlinedButton.styleFrom(
              foregroundColor: const Color(0xFFCBD5E1),
              side: BorderSide(color: borderColor),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            child: const Text('Reject'),
          ),
          const SizedBox(width: 8),
          ElevatedButton(
            onPressed: onAccept,
            style: ElevatedButton.styleFrom(
              backgroundColor: accentRed,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            child: const Text('Accept'),
          ),
        ],
      );
    }

    // In progress — the single next step allowed by the backend state machine.
    final next = assignment.nextAction;
    if (next != null) {
      return ElevatedButton(
        onPressed: () => onAdvance(next),
        style: ElevatedButton.styleFrom(
          backgroundColor: next == RiderAction.delivered ? accentGreen : const Color(0xFF3B82F6),
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
        child: Text(next.label),
      );
    }

    return Text(
      assignment.status.customerLabel,
      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF94A3B8)),
    );
  }
}
