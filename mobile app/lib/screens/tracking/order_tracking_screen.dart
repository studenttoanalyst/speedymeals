import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../core/constants/app_constants.dart'
    show AppConstants, OrderStatus;
import '../../core/network/api_exception.dart';
import '../../data/json_utils.dart';
import '../../data/models/order_models.dart';
import '../../data/models/rider_location.dart';
import '../../data/repositories/order_repository.dart';
import '../../data/repositories/rider_location_repository.dart';
import '../../features/maps/maps.dart';
import '../../services/live_location_socket.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

// ─────────────────────────────────────────────────────────────────────────────
// Mock data used exclusively by this screen
// ─────────────────────────────────────────────────────────────────────────────

/// Everything the tracking UI renders, derived from `GET /orders/{id}/track`.
///
/// Replaces the previous hardcoded `_MockTrackingData`. Anything the backend
/// does not provide is either computed from real values (the ETA, from the real
/// road distance) or omitted — never invented.
class TrackingView {
  /// Abbreviated id for display (see [shortOrderId]).
  final String orderId;

  /// The full UUID — the only form any API call accepts.
  final String rawOrderId;

  final OrderStatus status;
  final String restaurantName;
  final double foodSubtotal;
  final double deliveryFee;
  final double deliveryDistanceKm;
  final double totalAmount;

  /// Null until a rider is assigned — the backend never sends a placeholder.
  final String? riderName;
  final String? riderPhone;

  final DateTime? placedAt;
  final DateTime? deliveredAt;
  final List<OrderLineItem> items;

  // ── Real tracking geometry (from `GET /orders/{id}/track`) ────────────────
  final double? restaurantLatitude;
  final double? restaurantLongitude;
  final double? customerLatitude;
  final double? customerLongitude;
  final double? routeDistanceKm;
  final int? durationMins;
  final DateTime? eta;
  final String? polyline;

  const TrackingView({
    required this.orderId,
    required this.rawOrderId,
    required this.status,
    required this.restaurantName,
    this.foodSubtotal = 0,
    this.deliveryFee = 0,
    this.deliveryDistanceKm = 0,
    this.totalAmount = 0,
    this.riderName,
    this.riderPhone,
    this.placedAt,
    this.deliveredAt,
    this.items = const [],
    this.restaurantLatitude,
    this.restaurantLongitude,
    this.customerLatitude,
    this.customerLongitude,
    this.routeDistanceKm,
    this.durationMins,
    this.eta,
    this.polyline,
  });

  factory TrackingView.from(OrderTracking tracking) => TrackingView(
        orderId: shortOrderId(tracking.id),
        rawOrderId: tracking.id,
        status: tracking.status,
        restaurantName: tracking.restaurantName,
        foodSubtotal: tracking.foodSubtotal,
        deliveryFee: tracking.deliveryFee,
        deliveryDistanceKm: tracking.deliveryDistanceKm,
        totalAmount: tracking.totalAmount,
        riderName: tracking.riderName,
        riderPhone: tracking.riderPhone,
        placedAt: tracking.placedAt,
        deliveredAt: tracking.deliveredAt,
        items: tracking.items,
        restaurantLatitude: tracking.restaurantLatitude,
        restaurantLongitude: tracking.restaurantLongitude,
        customerLatitude: tracking.customerLatitude,
        customerLongitude: tracking.customerLongitude,
        routeDistanceKm: tracking.routeDistanceKm,
        durationMins: tracking.durationMins,
        eta: tracking.eta,
        polyline: tracking.polyline,
      );

  /// True once a rider has actually been attached to this order.
  bool get hasRider => riderName != null && riderName!.trim().isNotEmpty;

  bool get isDelivered => status == OrderStatus.delivered;
  bool get isCancelled => status == OrderStatus.cancelled;

  /// True when the remaining-time figure comes from the backend (`eta` or
  /// `duration_mins`) rather than the local distance-based fallback.
  bool get hasBackendEta => eta != null || durationMins != null;

  /// Minutes remaining.
  ///
  /// Prefers the backend's `eta` timestamp, then its `duration_mins`, and only
  /// falls back to the app's documented distance-and-speed estimate when the
  /// backend supplied neither. The UI labels the fallback as an estimate.
  int get etaMinutes {
    if (status.isTerminal) return 0;

    final backendEta = eta;
    if (backendEta != null) {
      final remaining = backendEta.difference(DateTime.now()).inMinutes;
      return remaining < 1 ? 1 : remaining;
    }

    final backendDuration = durationMins;
    if (backendDuration != null) {
      return backendDuration < 1 ? 1 : backendDuration;
    }

    final estimate = (AppConstants.baseEtaMinutes +
            deliveryDistanceKm * AppConstants.etaPerKmFactor)
        .round();
    return estimate < 1 ? 1 : estimate;
  }

  /// Clock time the delivery lands at, e.g. `1:42 PM`.
  ///
  /// Uses the backend `eta` verbatim when present; otherwise the local estimate.
  String get etaTimeLabel {
    final backendEta = eta;
    if (backendEta != null) return _clockLabel(backendEta);
    return _clockLabel(DateTime.now().add(Duration(minutes: etaMinutes)));
  }

  static String _clockLabel(DateTime time) {
    final hour = time.hour % 12 == 0 ? 12 : time.hour % 12;
    final minute = time.minute.toString().padLeft(2, '0');
    return '$hour:$minute ${time.hour >= 12 ? 'PM' : 'AM'}';
  }

  String get totalLabel => formatPkr(totalAmount);
  String get foodSubtotalLabel => formatPkr(foodSubtotal);
  String get deliveryFeeLabel => formatPkr(deliveryFee);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────────────────────

/// Live Order Tracking & Rating screen.
///
/// Keeps the same constructor signature as the original [OrderTrackingScreen]
/// while supporting an optional [riderLocationRepository] for Phase M3 testing.
class OrderTrackingScreen extends StatefulWidget {
  final String orderId;
  final RiderLocationRepository? riderLocationRepository;
  final OrderRepository? orderRepository;

  /// Optional live-tracking WebSocket service. Tests inject a fake so the
  /// screen's socket lifecycle is deterministic; production uses the default
  /// (`WS /orders/{order_id}/track`).
  final LiveLocationSocket? liveLocationSocket;

  const OrderTrackingScreen({
    super.key,
    required this.orderId,
    this.riderLocationRepository,
    this.orderRepository,
    this.liveLocationSocket,
  });

  @override
  State<OrderTrackingScreen> createState() => _OrderTrackingScreenState();
}

class _OrderTrackingScreenState extends State<OrderTrackingScreen>
    with TickerProviderStateMixin {
  late final AnimationController _riderBounceController;
  late final AnimationController _pingController;
  late final AnimationController _drawerController;
  late final Animation<double> _drawerSlide;

  late final OrderRepository _orderRepository;
  late final RiderLocationRepository _riderLocationRepository;

  TrackingView? _view;
  RiderLocation? _riderLocation;
  bool _isLocationUnavailable = false;
  bool _isLoading = true;
  ApiException? _error;

  /// One-shot poll timer for order status.
  Timer? _pollTimer;

  /// One-shot poll timer for live rider location (Phase M3 REST fallback).
  Timer? _riderLocationPollTimer;
  bool _isFetchingRiderLocation = false;
  static const Duration _riderLocationPollInterval = Duration(seconds: 8);

  /// Live-tracking WebSocket (Phase M6/B3 integration). Preferred transport:
  /// REST polling runs until the socket delivers its first frame, then pauses;
  /// it resumes automatically whenever the socket drops.
  late final LiveLocationSocket _liveSocket;
  StreamSubscription<LiveLocationEvent>? _liveSocketSub;
  bool _liveSocketStarted = false;
  bool _usingSocket = false;

  bool _drawerOpen = false;

  @override
  void initState() {
    super.initState();

    _orderRepository = widget.orderRepository ?? OrderRepository();
    _riderLocationRepository =
        widget.riderLocationRepository ?? HttpRiderLocationRepository();
    _liveSocket = widget.liveLocationSocket ?? LiveLocationSocket();
    _liveSocketSub = _liveSocket.events.listen(_onLiveLocationEvent);

    unawaited(_loadTracking());

    _riderBounceController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    )..repeat(reverse: true);

    _pingController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat();

    _drawerController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 320),
    );

    _drawerSlide = CurvedAnimation(
      parent: _drawerController,
      curve: Curves.easeOutCubic,
      reverseCurve: Curves.easeInCubic,
    );
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    _riderLocationPollTimer?.cancel();
    // Close the socket before tearing down the widget so no frame can arrive
    // after disposal.
    _liveSocketSub?.cancel();
    _liveSocketSub = null;
    unawaited(_liveSocket.dispose());
    _riderBounceController.dispose();
    _pingController.dispose();
    _drawerController.dispose();
    super.dispose();
  }

  /// Fetches the order from `GET /orders/{order_id}/track`.
  ///
  /// The backend has no WebSockets or push notifications, so tracking is
  /// poll-based. Polling stops as soon as the order reaches a terminal state
  /// (Delivered / Cancelled).
  Future<void> _loadTracking({bool showSpinner = false}) async {
    if (showSpinner && mounted) {
      setState(() => _isLoading = true);
    }

    try {
      final tracking = await _orderRepository.track(widget.orderId);
      if (!mounted) return;

      setState(() {
        _view = TrackingView.from(tracking);
        _isLoading = false;
        _error = null;
      });

      _scheduleNextPoll(tracking);
      _syncLiveLocation(tracking);
    } on ApiException catch (error) {
      if (!mounted) return;

      // Keep showing the last known good state if we already have one; a flaky
      // connection should not wipe the screen.
      setState(() {
        _error = error;
        _isLoading = false;
      });

      // The session is dead — stop streaming rather than reconnecting with a
      // token the server has already rejected.
      if (error.requiresReauth) {
        _stopLiveLocation();
      }

      if (_view != null && error.isRetryable) {
        _pollTimer = Timer(AppConstants.orderPollInterval, _loadTracking);
      }
    }
  }

  void _scheduleNextPoll(OrderTracking tracking) {
    _pollTimer?.cancel();
    if (!tracking.shouldKeepPolling) return;
    _pollTimer = Timer(AppConstants.orderPollInterval, _loadTracking);
  }

  /// Manages the live-location transports for the current order.
  ///
  /// Preferred transport is the WebSocket; REST polling to
  /// `GET /orders/{id}/rider-location` acts as the baseline and the fallback.
  /// Tracking only ever runs for an active order with an assigned rider, and
  /// stops entirely once the order is terminal.
  void _syncLiveLocation(OrderTracking tracking) {
    if (!tracking.shouldKeepPolling || !tracking.hasRider) {
      _stopLiveLocation();
      return;
    }

    _startLiveSocketIfNeeded();

    // Poll immediately while the socket is still connecting; once it delivers
    // a frame, polling pauses (see [_onLiveLocationEvent]).
    if (!_usingSocket &&
        _riderLocationPollTimer == null &&
        !_isFetchingRiderLocation) {
      _fetchRiderLocation();
    }
  }

  /// Opens the live WebSocket once per tracked order.
  void _startLiveSocketIfNeeded() {
    if (_liveSocketStarted) return;
    _liveSocketStarted = true;
    unawaited(_liveSocket.connect(widget.orderId));
  }

  /// Handles frames from the live WebSocket.
  void _onLiveLocationEvent(LiveLocationEvent event) {
    if (!mounted) return;

    switch (event) {
      case LiveLocationUpdated(:final location):
        // Live frames are authoritative — pause REST polling while they flow.
        _riderLocationPollTimer?.cancel();
        _riderLocationPollTimer = null;
        _usingSocket = true;
        setState(() {
          _riderLocation = location;
          _isLocationUnavailable = false;
        });

      case LiveLocationCompleted():
        // Terminal order: nothing left to stream or poll.
        _stopLiveLocation();

      case LiveLocationDisconnected():
        _usingSocket = false;
        final view = _view;
        if (view == null || !view.status.isActive || !view.hasRider) {
          return;
        }
        // Fall back to REST polling immediately (the socket may be silent, so a
        // single confirming poll is cheaper than waiting). The poll loop then
        // re-schedules itself at [_riderLocationPollInterval] while the socket
        // keeps retrying in the background; if it reconnects, the next live
        // frame pauses polling again.
        _riderLocationPollTimer?.cancel();
        _riderLocationPollTimer = Timer(Duration.zero, _fetchRiderLocation);
    }
  }

  /// Stops both transports for good (terminal order, re-auth needed, dispose).
  void _stopLiveLocation() {
    _riderLocationPollTimer?.cancel();
    _riderLocationPollTimer = null;
    _liveSocketStarted = false;
    _usingSocket = false;
    unawaited(_liveSocket.close());
  }

  /// Polls the latest live coordinates for the assigned rider.
  ///
  /// This is the REST fallback: `GET /orders/{order_id}/rider-location`.
  Future<void> _fetchRiderLocation() async {
    if (!mounted || _isFetchingRiderLocation) return;
    // A live socket frame is fresher than a poll; skip while it is healthy.
    if (_usingSocket) return;
    final view = _view;
    if (view == null || !view.hasRider || view.status.isTerminal) {
      _riderLocationPollTimer?.cancel();
      _riderLocationPollTimer = null;
      return;
    }

    _isFetchingRiderLocation = true;
    try {
      final loc = await _riderLocationRepository.getRiderLocation(widget.orderId);
      if (!mounted) return;

      if (loc != null) {
        setState(() {
          _riderLocation = loc;
          _isLocationUnavailable = false;
        });
      } else {
        // If we have not yet obtained a location, indicate unavailable state
        if (_riderLocation == null) {
          setState(() {
            _isLocationUnavailable = true;
          });
        }
      }
    } catch (_) {
      if (!mounted) return;
      if (_riderLocation == null) {
        setState(() {
          _isLocationUnavailable = true;
        });
      }
    } finally {
      _isFetchingRiderLocation = false;
      if (mounted && !_usingSocket) {
        final currentView = _view;
        if (currentView != null &&
            currentView.hasRider &&
            !currentView.status.isTerminal) {
          _riderLocationPollTimer?.cancel();
          _riderLocationPollTimer =
              Timer(_riderLocationPollInterval, _fetchRiderLocation);
        }
      }
    }
  }

  void _openDrawer() {
    setState(() => _drawerOpen = true);
    _drawerController.forward();
  }

  void _closeDrawer() {
    _drawerController.reverse().then((_) {
      if (mounted) setState(() => _drawerOpen = false);
    });
  }

  @override
  Widget build(BuildContext context) {
    final view = _view;

    if (view == null) {
      return _TrackingPlaceholder(
        isLoading: _isLoading,
        error: _error,
        onRetry: () => _loadTracking(showSpinner: true),
      );
    }

    return Scaffold(
      backgroundColor: const Color(0xFFFAF8FF),
      body: Stack(
        children: [
          // ── Main scrollable content ──────────────────────────────────────
          SafeArea(
            child: Column(
              children: [
                _AppBar(onBack: () => Navigator.of(context).maybePop()),
                if (_error != null)
                  Container(
                    width: double.infinity,
                    color: const Color(0xFFFEF3C7),
                    padding: const EdgeInsets.symmetric(
                        horizontal: 16, vertical: 8),
                    child: Row(
                      children: const [
                        Icon(Icons.cloud_off_rounded,
                            size: 16, color: Color(0xFFB45309)),
                        SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'Showing the last update we received.',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: Color(0xFF92400E),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                Expanded(
                  child: SingleChildScrollView(
                    child: Column(
                      children: [
                        _EtaBar(
                          pingController: _pingController,
                          view: view,
                        ),
                        _MapView(
                          riderBounceController: _riderBounceController,
                          view: view,
                          riderLocation: _riderLocation,
                          isLocationUnavailable: _isLocationUnavailable,
                        ),
                        // Cards section — sits on top of map with negative margin
                        Transform.translate(
                          offset: const Offset(0, -16),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                            child: Column(
                              children: [
                                _OrderProgressCard(status: view.status),
                                const SizedBox(height: 12),
                                _RiderCard(
                                  onChatTap: _openDrawer,
                                  view: view,
                                ),
                                const SizedBox(height: 12),
                                _OrderItemsCard(
                                  onRateTap: _openDrawer,
                                  view: view,
                                ),
                                const SizedBox(height: 24),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),

          // ── Rating Drawer Overlay ────────────────────────────────────────
          if (_drawerOpen)
            GestureDetector(
              onTap: _closeDrawer,
              child: AnimatedBuilder(
                animation: _drawerSlide,
                builder: (context, _) => Container(
                  color: Colors.black.withValues(
                    alpha: 0.4 * _drawerSlide.value,
                  ),
                ),
              ),
            ),

          if (_drawerOpen)
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              child: SlideTransition(
                position: Tween<Offset>(
                  begin: const Offset(0, 1),
                  end: Offset.zero,
                ).animate(_drawerSlide),
                child: _RatingDrawer(
                  onClose: _closeDrawer,
                  view: view,
                  onSubmitted: _loadTracking,
                ),
              ),
            ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// App Bar
// ─────────────────────────────────────────────────────────────────────────────

class _AppBar extends StatelessWidget {
  final VoidCallback onBack;

  const _AppBar({required this.onBack});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 64,
      padding: const EdgeInsets.symmetric(horizontal: 4),
      decoration: BoxDecoration(
        color: const Color(0xFFFAF8FF).withValues(alpha: 0.9),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 8,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      child: Row(
        children: [
          // Back button
          IconButton(
            icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 22),
            color: const Color(0xFF131B2E),
            onPressed: onBack,
          ),
          const Expanded(
            child: Text(
              'Live Order Tracking',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: Color(0xFF131B2E),
                letterSpacing: -0.005 * 18,
              ),
            ),
          ),
          // Logo avatar
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: Container(
              width: 32,
              height: 32,
              decoration: const BoxDecoration(
                shape: BoxShape.circle,
                color: Color(0xFFDC2626),
              ),
              child: const Icon(Icons.person, color: Colors.white, size: 18),
            ),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ETA Bar
// ─────────────────────────────────────────────────────────────────────────────

class _EtaBar extends StatelessWidget {
  final AnimationController pingController;
  final TrackingView view;

  const _EtaBar({required this.pingController, required this.view});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      color: Colors.white,
      child: Row(
        children: [
          // Order # + time remaining
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      'ORDER #${view.orderId}',
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.03 * 11,
                        color: Color(0xFF1D4ED8),
                      ),
                    ),
                    const SizedBox(width: 6),
                    AnimatedBuilder(
                      animation: pingController,
                      builder: (context, _) {
                        final scale = 0.5 + 0.5 * pingController.value;
                        return Transform.scale(
                          scale: scale,
                          child: Container(
                            width: 7,
                            height: 7,
                            decoration: const BoxDecoration(
                              shape: BoxShape.circle,
                              color: Color(0xFFDC2626),
                            ),
                          ),
                        );
                      },
                    ),
                  ],
                ),
                const SizedBox(height: 2),
                RichText(
                  text: TextSpan(
                    children: [
                      TextSpan(
                        text: view.status.isTerminal
                            ? view.status.customerLabel
                            : '~${view.etaMinutes} Mins',
                        style: const TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFFDC2626),
                          letterSpacing: -0.01 * 22,
                        ),
                      ),
                      TextSpan(
                        // Only label the local distance fallback as an estimate;
                        // a backend `eta`/`duration_mins` is authoritative.
                        text: view.status.isTerminal || view.hasBackendEta
                            ? ''
                            : '  estimated',
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w400,
                          color: Color(0xFF5C403C),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          // Estimated arrival
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                view.isDelivered ? 'Completed' : 'Estimated arrival',
                style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF5C403C),
                  letterSpacing: 0.02 * 11,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                view.isDelivered
                    ? view.status.customerLabel
                    : view.etaTimeLabel,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF131B2E),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Map View (stylised mock map)
// ─────────────────────────────────────────────────────────────────────────────

class _MapView extends StatelessWidget {
  final AnimationController riderBounceController;
  final TrackingView view;
  final RiderLocation? riderLocation;
  final bool isLocationUnavailable;

  const _MapView({
    required this.riderBounceController,
    required this.view,
    this.riderLocation,
    this.isLocationUnavailable = false,
  });

  /// Rejects null/NaN/Infinite/out-of-bounds coordinates so a bad value is
  /// never rendered as if it were a real pin.
  static bool _isValidCoordinate(double? lat, double? lng) {
    if (lat == null || lng == null) return false;
    if (lat.isNaN || lng.isNaN || lat.isInfinite || lng.isInfinite) return false;
    return lat >= -90.0 && lat <= 90.0 && lng >= -180.0 && lng <= 180.0;
  }

  @override
  Widget build(BuildContext context) {
    final restaurantLat = view.restaurantLatitude;
    final restaurantLng = view.restaurantLongitude;
    final customerLat = view.customerLatitude;
    final customerLng = view.customerLongitude;

    final hasRestaurant = _isValidCoordinate(restaurantLat, restaurantLng);
    final hasCustomer = _isValidCoordinate(customerLat, customerLng);

    // The rider marker is drawn ONLY from a real coordinate delivered by the
    // backend (REST `GET /orders/{id}/rider-location` or the live WebSocket).
    // There is deliberately no interpolated/midpoint stand-in: an unknown rider
    // position must never be rendered as if it were a real one. Until a fresh
    // coordinate arrives the banner explains that tracking is pending.
    final rider = riderLocation;
    final hasRiderFix = rider != null &&
        _isValidCoordinate(rider.latitude, rider.longitude);

    final markers = <Marker>{
      if (hasRestaurant)
        MapMarkers.restaurant(
          id: view.orderId,
          position: LatLng(restaurantLat!, restaurantLng!),
          name: view.restaurantName,
        ),
      if (hasCustomer)
        MapMarkers.customer(
          id: view.orderId,
          position: LatLng(customerLat!, customerLng!),
          title: 'Delivery Address',
        ),
      if (view.hasRider && hasRiderFix)
        MapMarkers.rider(
          id: view.orderId,
          position: LatLng(rider.latitude, rider.longitude),
          riderName: view.riderName ?? 'Rider',
        ),
    };

    // Route geometry is decoded from the backend polyline; an empty list means
    // no route line is drawn (never a fabricated bezier path).
    final routePoints = PolylineDecoder.decode(view.polyline);
    final polylines = <Polyline>{
      if (routePoints.length >= 2)
        Polyline(
          polylineId: PolylineId('route_${view.orderId}'),
          points: routePoints,
          color: const Color(0xFF1D4ED8),
          width: 5,
        ),
    };

    // Camera target prefers a real endpoint, then the live rider fix. When
    // nothing real is known `initialPosition` is null and MapView falls back
    // to its documented default centre — no marker is fabricated from it.
    final initialTarget = hasRestaurant
        ? LatLng(restaurantLat!, restaurantLng!)
        : hasCustomer
            ? LatLng(customerLat!, customerLng!)
            : hasRiderFix
                ? LatLng(rider.latitude, rider.longitude)
                : null;

    final hasRealLocation = hasRestaurant || hasCustomer || hasRiderFix;

    return SizedBox(
      height: 288,
      child: Stack(
        children: [
          // Google Map base layer — only real coordinates are drawn. When the
          // backend has sent no location at all, an explicit unavailable state
          // replaces the map rather than a fabricated default centre.
          Positioned.fill(
            child: hasRealLocation
                ? MapView(
                    initialPosition: initialTarget,
                    initialZoom: 14.0,
                    markers: markers,
                    polylines: polylines,
                    fitBoundsOnMarkers: false,
                    fallbackBuilder: (context, error) {
                      return Container(
                        width: double.infinity,
                        height: 288,
                        color: const Color(0xFFE2E7FF),
                        child: CustomPaint(painter: _MapGridPainter()),
                      );
                    },
                  )
                : const _LocationUnavailable(),
          ),

          // Frosted overlay (only over a real map)
          if (hasRealLocation)
            Container(
              color: const Color(0xFFFAF8FF).withValues(alpha: 0.18),
            ),

          // Rider mascot pin — only while a real rider fix exists (the live
          // marker on the map is the authoritative position).
          if (view.hasRider && hasRiderFix)
            Positioned(
              top: 100,
              left: 150,
              child: AnimatedBuilder(
                animation: riderBounceController,
                builder: (context, child) {
                  return Transform.translate(
                    offset: Offset(
                        0, -6 * math.sin(riderBounceController.value * math.pi)),
                    child: child,
                  );
                },
                child: Column(
                  children: [
                    // Label bubble — shows real rider name from backend
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: const Color(0xFFB70011),
                        borderRadius: BorderRadius.circular(999),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.18),
                            blurRadius: 6,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            width: 7,
                            height: 7,
                            decoration: const BoxDecoration(
                              shape: BoxShape.circle,
                              color: Colors.white,
                            ),
                          ),
                          const SizedBox(width: 4),
                          Text(
                            view.riderName ?? 'Rider',
                            style: const TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                              color: Colors.white,
                              letterSpacing: 0.02,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 4),
                    // Rider circle
                    Container(
                      width: 48,
                      height: 48,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: Colors.white,
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.2),
                            blurRadius: 8,
                            offset: const Offset(0, 3),
                          ),
                        ],
                      ),
                      child: const Icon(
                        Icons.directions_bike_rounded,
                        color: Color(0xFFDC2626),
                        size: 26,
                      ),
                    ),
                  ],
                ),
              ),
            ),

          // Indicator when rider is assigned but live location is unavailable (Phase M3)
          if (view.hasRider && !view.isDelivered && !view.isCancelled && isLocationUnavailable)
            Positioned(
              top: 12,
              left: 0,
              right: 0,
              child: Center(
                child: Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.94),
                    borderRadius: BorderRadius.circular(999),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.1),
                        blurRadius: 6,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.location_off_rounded, size: 13, color: Color(0xFFB45309)),
                      SizedBox(width: 5),
                      Text(
                        'Rider location is currently unavailable.',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF92400E),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),

          // Placeholder when no rider is assigned yet
          if (!view.hasRider && !view.isDelivered && !view.isCancelled)
            Positioned(
              top: 120,
              left: 0,
              right: 0,
              child: Center(
                child: Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.9),
                    borderRadius: BorderRadius.circular(999),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.1),
                        blurRadius: 6,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      SizedBox(
                        width: 12,
                        height: 12,
                        child: CircularProgressIndicator(strokeWidth: 1.5),
                      ),
                      SizedBox(width: 6),
                      Text(
                        'Finding rider...',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF5C403C),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),

          // Map control buttons — right side
          Positioned(
            right: 12,
            top: 12,
            child: Column(
              children: [
                _MapControlButton(
                  icon: Icons.near_me_rounded,
                  onTap: () {},
                ),
                const SizedBox(height: 8),
                _MapControlButton(
                  icon: Icons.fullscreen_rounded,
                  onTap: () {},
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// Map grid background painter
class _MapGridPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = const Color(0xFFB7C4FF).withValues(alpha: 0.3)
      ..strokeWidth = 1;

    const spacing = 32.0;
    for (double x = 0; x < size.width; x += spacing) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), paint);
    }
    for (double y = 0; y < size.height; y += spacing) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), paint);
    }

    // Simulate some road blocks
    final roadPaint = Paint()
      ..color = Colors.white.withValues(alpha: 0.55)
      ..strokeWidth = 6
      ..strokeCap = StrokeCap.round;

    canvas.drawLine(
        const Offset(0, 96), Offset(size.width, 96), roadPaint);
    canvas.drawLine(
        const Offset(0, 192), Offset(size.width, 192), roadPaint);
    canvas.drawLine(
        const Offset(96, 0), const Offset(96, 288), roadPaint);
    canvas.drawLine(
        const Offset(240, 0), const Offset(240, 288), roadPaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// Shown in place of the map when the backend has sent no usable location.
///
/// Rendered instead of fabricated pins: until a real restaurant, customer or
/// rider coordinate exists there is nothing truthful to draw.
class _LocationUnavailable extends StatelessWidget {
  const _LocationUnavailable();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      height: 288,
      color: const Color(0xFFE2E7FF),
      child: const Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.location_off_rounded,
                size: 36, color: Color(0xFFB45309)),
            SizedBox(height: 8),
            Text(
              'Location unavailable',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w700,
                color: Color(0xFF92400E),
              ),
            ),
            SizedBox(height: 4),
            Text(
              'Waiting for the restaurant and delivery location.',
              style: TextStyle(fontSize: 12, color: Color(0xFF92400E)),
            ),
          ],
        ),
      ),
    );
  }
}

class _MapControlButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;

  const _MapControlButton({required this.icon, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(10),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.1),
              blurRadius: 6,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Icon(icon, size: 20, color: const Color(0xFF131B2E)),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Order Progress Card
// ─────────────────────────────────────────────────────────────────────────────

class _OrderProgressCard extends StatelessWidget {
  final OrderStatus status;

  const _OrderProgressCard({required this.status});

  @override
  Widget build(BuildContext context) {
    // Use the trackerStep which correctly maps the 11 backend statuses
    // to the 5-step customer tracker: 0=confirmed, 1=preparing, 2=rider,
    // 3=on the way, 4=delivered.
    final activeIdx = status.trackerStep;
    final isCancelled = status == OrderStatus.cancelled;
    final isTerminal = status.isTerminal;

    // Dynamic header text based on actual order status.
    final String headerTitle;
    final String headerSubtitle;
    final IconData headerIcon;

    if (isCancelled) {
      headerTitle = 'Order cancelled';
      headerSubtitle = 'This order has been cancelled.';
      headerIcon = Icons.cancel_outlined;
    } else if (isTerminal) {
      headerTitle = 'Order delivered';
      headerSubtitle = 'Your meal has arrived. Enjoy!';
      headerIcon = Icons.check_circle_outline_rounded;
    } else {
      headerTitle = status.customerLabel;
      headerSubtitle = 'Your order is being taken care of';
      headerIcon = Icons.electric_moped_rounded;
    }

    return _CardShell(
      child: Column(
        children: [
          // Header row
          Row(
            children: [
              Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  color: isCancelled
                      ? const Color(0xFFFEE2E2)
                      : isTerminal
                          ? const Color(0xFFDCFCE7)
                          : const Color(0xFFFFDAD6),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Icon(
                  headerIcon,
                  color: isCancelled
                      ? const Color(0xFFDC2626)
                      : isTerminal
                          ? const Color(0xFF16A34A)
                          : const Color(0xFFDC2626),
                  size: 18,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      headerTitle,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF131B2E),
                      ),
                    ),
                    Text(
                      headerSubtitle,
                      style: const TextStyle(
                        fontSize: 12,
                        color: Color(0xFF5C403C),
                      ),
                    ),
                  ],
                ),
              ),
              if (!isCancelled && !isTerminal)
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: const Color(0xFFDCE1FF),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: const Text(
                    'Live GPS',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF001551),
                      letterSpacing: 0.03 * 11,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 16),

          // Horizontal stepper (hidden for cancelled orders)
          if (!isCancelled) _HorizontalStepper(activeIdx: activeIdx),
        ],
      ),
    );
  }
}

class _HorizontalStepper extends StatelessWidget {
  final int activeIdx;

  const _HorizontalStepper({required this.activeIdx});

  static const _steps = [
    {'label': 'Placed', 'icon': Icons.check_rounded},
    {'label': 'Confirmed', 'icon': Icons.check_rounded},
    {'label': 'Prepared', 'icon': Icons.check_rounded},
    {'label': 'On Delivery', 'icon': Icons.sports_motorsports_rounded},
    {'label': 'Delivered', 'icon': Icons.home_rounded},
  ];

  @override
  Widget build(BuildContext context) {
    // Progress fraction (0.0 – 1.0) based on activeIdx
    final progressFraction = activeIdx / (_steps.length - 1);

    return Column(
      children: [
        SizedBox(
          height: 44,
          child: Stack(
            alignment: Alignment.center,
            children: [
              // Track background
              Positioned(
                left: 12,
                right: 12,
                child: Container(
                  height: 4,
                  decoration: BoxDecoration(
                    color: const Color(0xFFE2E7FF),
                    borderRadius: BorderRadius.circular(999),
                  ),
                ),
              ),
              // Track fill
              Positioned(
                left: 12,
                right: 12,
                child: LayoutBuilder(builder: (context, constraints) {
                  return Row(
                    children: [
                      Container(
                        height: 4,
                        width:
                            constraints.maxWidth * progressFraction,
                        decoration: BoxDecoration(
                          color: const Color(0xFF1D4ED8),
                          borderRadius: BorderRadius.circular(999),
                        ),
                      ),
                    ],
                  );
                }),
              ),
              // Step dots
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: List.generate(_steps.length, (i) {
                  final isCompleted = i < activeIdx;
                  final isActive = i == activeIdx;

                  if (isActive) {
                    return _ActiveStepDot(
                      icon: _steps[i]['icon'] as IconData,
                    );
                  } else if (isCompleted) {
                    return _CompletedStepDot();
                  } else {
                    return _PendingStepDot(
                      icon: _steps[i]['icon'] as IconData,
                    );
                  }
                }),
              ),
            ],
          ),
        ),
        const SizedBox(height: 4),
        // Labels row
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: List.generate(_steps.length, (i) {
            final isActive = i == activeIdx;
            final isCompleted = i < activeIdx;
            return SizedBox(
              width: 60,
              child: Text(
                _steps[i]['label'] as String,
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: isActive
                      ? FontWeight.w800
                      : (isCompleted ? FontWeight.w600 : FontWeight.w500),
                  color: isActive
                      ? const Color(0xFFDC2626)
                      : (isCompleted
                          ? const Color(0xFF131B2E)
                          : const Color(0xFF5C403C)),
                ),
              ),
            );
          }),
        ),
      ],
    );
  }
}

class _CompletedStepDot extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      width: 24,
      height: 24,
      decoration: const BoxDecoration(
        shape: BoxShape.circle,
        color: Color(0xFF1D4ED8),
      ),
      child: const Icon(Icons.check_rounded, color: Colors.white, size: 14),
    );
  }
}

class _ActiveStepDot extends StatelessWidget {
  final IconData icon;

  const _ActiveStepDot({required this.icon});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 28,
      height: 28,
      decoration: const BoxDecoration(
        shape: BoxShape.circle,
        color: Color(0xFFDC2626),
        boxShadow: [
          BoxShadow(
            color: Color(0x44DC2626),
            blurRadius: 6,
            offset: Offset(0, 2),
          ),
        ],
      ),
      child: Icon(icon, color: Colors.white, size: 15),
    );
  }
}

class _PendingStepDot extends StatelessWidget {
  final IconData icon;

  const _PendingStepDot({required this.icon});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 24,
      height: 24,
      decoration: const BoxDecoration(
        shape: BoxShape.circle,
        color: Color(0xFFDAE2FD),
      ),
      child: Icon(icon, color: const Color(0xFF5C403C), size: 13),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Rider Card
// ─────────────────────────────────────────────────────────────────────────────

class _RiderCard extends StatelessWidget {
  final VoidCallback onChatTap;
  final TrackingView view;

  const _RiderCard({required this.onChatTap, required this.view});

  @override
  Widget build(BuildContext context) {
    // No rider has been assigned yet (the backend leaves rider_name null until
    // assignment succeeds) — say so rather than showing a stand-in rider.
    if (!view.hasRider) {
      return _CardShell(
        child: Row(
          children: const [
            SizedBox(
              width: 24,
              height: 24,
              child: CircularProgressIndicator(strokeWidth: 2.5),
            ),
            SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Finding your rider',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF131B2E),
                    ),
                  ),
                  SizedBox(height: 2),
                  Text(
                    'We will attach the nearest available rider to your order.',
                    style: TextStyle(fontSize: 12, color: Color(0xFF5C403C)),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    }

    return _CardShell(
      child: Column(
        children: [
          // Rider info row
          Row(
            children: [
              // Avatar with verified badge
              Stack(
                clipBehavior: Clip.none,
                children: [
                  Container(
                    width: 56,
                    height: 56,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: const Color(0xFFEAEDFF),
                      border: Border.all(
                        color: const Color(0xFFDC2626),
                        width: 2,
                      ),
                    ),
                    child: const Icon(
                      Icons.person_rounded,
                      color: Color(0xFFDC2626),
                      size: 32,
                    ),
                  ),
                  Positioned(
                    bottom: -2,
                    right: -2,
                    child: Container(
                      width: 20,
                      height: 20,
                      decoration: const BoxDecoration(
                        shape: BoxShape.circle,
                        color: Color(0xFFDC2626),
                      ),
                      child: const Icon(Icons.verified_rounded,
                          color: Colors.white, size: 12),
                    ),
                  ),
                ],
              ),
              const SizedBox(width: 12),
              // Name + details
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Flexible(
                          child: Text(
                            view.riderName ?? '',
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFF131B2E),
                            ),
                          ),
                        ),
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: const Color(0xFFDCFCE7),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: const Row(
                            children: [
                              Icon(Icons.verified_rounded,
                                  color: Color(0xFF166534), size: 12),
                              SizedBox(width: 2),
                              Text(
                                'Assigned',
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700,
                                  color: Color(0xFF14532D),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(
                      // The real contact number the backend exposes. It used to
                      // show an invented badge/vehicle/rating that no endpoint
                      // provides.
                      view.riderPhone ?? 'Delivery rider',
                      style: const TextStyle(
                        fontSize: 12,
                        color: Color(0xFF5C403C),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Action buttons
          Row(
            children: [
              Expanded(
                child: _ActionButton(
                  icon: Icons.call_rounded,
                  label: 'Call Rider',
                  iconColor: const Color(0xFF1D4ED8),
                  backgroundColor: const Color(0xFFDCE1FF),
                  textColor: const Color(0xFF001551),
                  onTap: () {},
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _ActionButton(
                  icon: Icons.chat_bubble_rounded,
                  label: 'Chat Rider',
                  iconColor: const Color(0xFFDC2626),
                  backgroundColor: const Color(0xFFE2E7FF),
                  textColor: const Color(0xFF131B2E),
                  onTap: onChatTap,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _ActionButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color iconColor;
  final Color backgroundColor;
  final Color textColor;
  final VoidCallback onTap;

  const _ActionButton({
    required this.icon,
    required this.label,
    required this.iconColor,
    required this.backgroundColor,
    required this.textColor,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: 44,
        decoration: BoxDecoration(
          color: backgroundColor,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 20, color: iconColor),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: textColor,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Order Items Card
// ─────────────────────────────────────────────────────────────────────────────

class _OrderItemsCard extends StatelessWidget {
  final VoidCallback onRateTap;
  final TrackingView view;

  const _OrderItemsCard({required this.onRateTap, required this.view});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Order items box
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: const Color(0xFFF2F3FF),
            borderRadius: BorderRadius.circular(14),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Order Items (${view.items.length})',
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF131B2E),
                    ),
                  ),
                  GestureDetector(
                    onTap: () {},
                    child: const Text(
                      'View Receipt',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF1D4ED8),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              if (view.items.isEmpty)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 6),
                  child: Text(
                    'No items on this order.',
                    style: TextStyle(fontSize: 13, color: Color(0xFF5C403C)),
                  ),
                )
              else
                ...view.items.map((item) {
                  return Padding(
                    padding: const EdgeInsets.symmetric(vertical: 4),
                    child: Row(
                      children: [
                        Container(
                          width: 22,
                          height: 22,
                          decoration: BoxDecoration(
                            color: const Color(0xFFEAEDFF),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Center(
                            child: Text(
                              '${item.quantity}x',
                              style: const TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w700,
                                color: Color(0xFF131B2E),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            item.name,
                            style: const TextStyle(
                              fontSize: 14,
                              color: Color(0xFF131B2E),
                            ),
                          ),
                        ),
                        Text(
                          formatPkr(item.lineTotal),
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w800,
                            color: Color(0xFF131B2E),
                            letterSpacing: -0.01 * 16,
                          ),
                        ),
                      ],
                    ),
                  );
                }),
            ],
          ),
        ),
        if (view.isDelivered) ...[const SizedBox(height: 12),

        // Rate Experience button — only shown for delivered orders
        GestureDetector(
          onTap: onRateTap,
          child: Container(
            width: double.infinity,
            height: 50,
            decoration: BoxDecoration(
              color: const Color(0xFFDC2626),
              borderRadius: BorderRadius.circular(14),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFFDC2626).withValues(alpha: 0.3),
                  blurRadius: 8,
                  offset: const Offset(0, 3),
                ),
              ],
            ),
            child: const Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.thumb_up_rounded, color: Colors.white, size: 20),
                SizedBox(width: 8),
                Text(
                  'Rate Experience',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: Colors.white,
                    letterSpacing: -0.01 * 15,
                  ),
                ),
              ],
            ),
          ),
        ),],
      ],
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Rating Drawer (bottom sheet)
// ─────────────────────────────────────────────────────────────────────────────

class _RatingDrawer extends StatefulWidget {
  final VoidCallback onClose;
  final TrackingView view;

  /// Called after the rating is accepted so the screen can refresh.
  final Future<void> Function() onSubmitted;

  const _RatingDrawer({
    required this.onClose,
    required this.view,
    required this.onSubmitted,
  });

  @override
  State<_RatingDrawer> createState() => _RatingDrawerState();
}

class _RatingDrawerState extends State<_RatingDrawer> {
  int _foodRating = 5;
  int _speedRating = 5;
  bool _isSubmitting = false;
  bool _alreadyRated = false;
  final TextEditingController _commentController = TextEditingController();

  final OrderRepository _orderRepository = OrderRepository();

  /// Submits the rating for real via `POST /orders/{id}/rating`.
  ///
  /// The backend accepts this only for a Delivered order and only once; a
  /// second attempt comes back as a 400, which is surfaced rather than hidden.
  Future<void> _submitRating() async {
    if (_isSubmitting || _alreadyRated) return;
    setState(() => _isSubmitting = true);

    // Build the comment from highlights + free-text field.
    final parts = <String>[
      ..._selectedHighlights,
    ];
    final freeText = _commentController.text.trim();
    if (freeText.isNotEmpty) parts.add(freeText);
    final comment = parts.isEmpty ? null : parts.join('\n');

    try {
      await _orderRepository.submitRating(
        orderId: widget.view.rawOrderId,
        restaurantRating: _foodRating,
        // Only rated when a rider was actually assigned to the order.
        riderRating: widget.view.hasRider ? _speedRating : null,
        comment: comment,
      );

      if (!mounted) return;
      setState(() => _alreadyRated = true);
      widget.onClose();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Thank you for your feedback! 🎉'),
          backgroundColor: Color(0xFF1D4ED8),
          behavior: SnackBarBehavior.floating,
        ),
      );
    } on ApiException catch (error) {
      if (!mounted) return;
      // Backend returns 400 "Order already rated" for duplicates — treat
      // as success rather than an error the user can fix.
      if (error.message.toLowerCase().contains('already rated')) {
        setState(() => _alreadyRated = true);
        widget.onClose();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('This order has already been rated.'),
            backgroundColor: Color(0xFF1D4ED8),
            behavior: SnackBarBehavior.floating,
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(error.message),
            backgroundColor: const Color(0xFFDC2626),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  final Set<String> _selectedHighlights = {'Super Fast ⚡'};

  static const _foodLabels = [
    '1.0 Poor',
    '2.0 Mediocre',
    '3.0 Good',
    '4.0 Very Good',
    '5.0 Delicious',
  ];

  static const _speedLabels = [
    'Very Delayed',
    'Slow',
    'Standard',
    'Great Time',
    'Lightning Fast',
  ];

  static const _highlights = [
    'Super Fast ⚡',
    'Food was Hot 🍔',
    'Polite Rider 😊',
    'Eco Packaging 🌿',
  ];

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.88,
      ),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        boxShadow: [
          BoxShadow(
            color: Color(0x33000000),
            blurRadius: 20,
            offset: Offset(0, -4),
          ),
        ],
      ),
      child: SingleChildScrollView(
        padding: EdgeInsets.only(
          left: 20,
          right: 20,
          top: 12,
          bottom: MediaQuery.of(context).viewInsets.bottom + 24,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Drag handle
            Center(
              child: GestureDetector(
                onTap: widget.onClose,
                child: Container(
                  width: 48,
                  height: 5,
                  margin: const EdgeInsets.only(bottom: 16),
                  decoration: BoxDecoration(
                    color: const Color(0xFFDAE2FD),
                    borderRadius: BorderRadius.circular(999),
                  ),
                ),
              ),
            ),

            // Heart icon + header
            Center(
              child: Column(
                children: [
                  Container(
                    width: 64,
                    height: 64,
                    decoration: const BoxDecoration(
                      shape: BoxShape.circle,
                      color: Color(0xFFFFDAD6),
                    ),
                    child: const Icon(Icons.favorite_rounded,
                        color: Color(0xFFB70011), size: 32),
                  ),
                  const SizedBox(height: 10),
                  const Text(
                    'How was your Speedy Meal?',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF131B2E),
                      letterSpacing: -0.015 * 22,
                    ),
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    'Your feedback keeps our couriers and kitchen blazing fast!',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 14,
                      color: Color(0xFF5C403C),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Food Quality Rating
            _RatingSection(
              title: 'Food Quality & Freshness',
              ratingLabel: _foodLabels[_foodRating - 1],
              labelColor: const Color(0xFFDC2626),
              starColor: const Color(0xFF7F4F00),
              currentRating: _foodRating,
              onRatingChanged: (r) => setState(() => _foodRating = r),
            ),
            const SizedBox(height: 12),

            // Delivery Speed Rating
            _RatingSection(
              title:
                  "Rider ${widget.view.riderName?.split(' ').first ?? 'delivery'} Speed",
              ratingLabel: _speedLabels[_speedRating - 1],
              labelColor: const Color(0xFF1D4ED8),
              starColor: const Color(0xFF1D4ED8),
              currentRating: _speedRating,
              onRatingChanged: (r) => setState(() => _speedRating = r),
            ),
            const SizedBox(height: 16),

            // Highlights
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'HIGHLIGHTS',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF5C403C),
                    letterSpacing: 0.03 * 11,
                  ),
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: _highlights.map((tag) {
                    final selected = _selectedHighlights.contains(tag);
                    return GestureDetector(
                      onTap: () {
                        setState(() {
                          if (selected) {
                            _selectedHighlights.remove(tag);
                          } else {
                            _selectedHighlights.add(tag);
                          }
                        });
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 14, vertical: 8),
                        decoration: BoxDecoration(
                          color: selected
                              ? const Color(0xFFDC2626)
                              : const Color(0xFFE2E7FF),
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: Text(
                          tag,
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: selected
                                ? Colors.white
                                : const Color(0xFF131B2E),
                          ),
                        ),
                      ),
                    );
                  }).toList(),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Free-text comment field
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'REVIEW',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF5C403C),
                    letterSpacing: 0.03 * 11,
                  ),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: _commentController,
                  maxLines: 3,
                  maxLength: 1000,
                  enabled: !_alreadyRated && !_isSubmitting,
                  style: const TextStyle(
                    fontSize: 14,
                    color: Color(0xFF131B2E),
                  ),
                  decoration: InputDecoration(
                    hintText: 'Tell us more about your experience (optional)...',
                    hintStyle: const TextStyle(
                      fontSize: 13,
                      color: Color(0xFF94A3B8),
                    ),
                    filled: true,
                    fillColor: const Color(0xFFF2F3FF),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide.none,
                    ),
                    contentPadding: const EdgeInsets.all(14),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),

            // Submit button
            if (_alreadyRated)
              Container(
                height: 50,
                decoration: BoxDecoration(
                  color: const Color(0xFF1D4ED8),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: const Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.check_circle_rounded, color: Colors.white, size: 20),
                    SizedBox(width: 8),
                    Text(
                      'Already Rated',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: Colors.white,
                      ),
                    ),
                  ],
                ),
              )
            else
              GestureDetector(
                onTap: _isSubmitting ? null : _submitRating,
                child: Container(
                  height: 50,
                  decoration: BoxDecoration(
                    color: _isSubmitting
                        ? const Color(0xFF94A3B8)
                        : const Color(0xFFDC2626),
                    borderRadius: BorderRadius.circular(14),
                    boxShadow: [
                      BoxShadow(
                        color: (_isSubmitting
                                ? const Color(0xFF94A3B8)
                                : const Color(0xFFDC2626))
                            .withValues(alpha: 0.3),
                        blurRadius: 8,
                        offset: const Offset(0, 3),
                      ),
                    ],
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      if (_isSubmitting)
                        const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      else
                        const Text(
                          'Submit Feedback',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            color: Colors.white,
                          ),
                        ),
                      if (!_isSubmitting) ...[const SizedBox(width: 8), const Icon(Icons.send_rounded, color: Colors.white, size: 18)],
                    ],
                  ),
                ),
              ),
            const SizedBox(height: 10),

            // Maybe later
            GestureDetector(
              onTap: widget.onClose,
              child: const Center(
                child: Padding(
                  padding: EdgeInsets.symmetric(vertical: 6),
                  child: Text(
                    'Maybe Later',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF5C403C),
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _RatingSection extends StatelessWidget {
  final String title;
  final String ratingLabel;
  final Color labelColor;
  final Color starColor;
  final int currentRating;
  final ValueChanged<int> onRatingChanged;

  const _RatingSection({
    required this.title,
    required this.ratingLabel,
    required this.labelColor,
    required this.starColor,
    required this.currentRating,
    required this.onRatingChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFF2F3FF),
        borderRadius: BorderRadius.circular(14),
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
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF131B2E),
                  ),
                ),
              ),
              Text(
                ratingLabel,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: labelColor,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(5, (i) {
              final filled = i < currentRating;
              return GestureDetector(
                onTap: () => onRatingChanged(i + 1),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 4),
                  child: Icon(
                    filled ? Icons.star_rounded : Icons.star_outline_rounded,
                    color: filled ? starColor : const Color(0xFFDAE2FD),
                    size: 36,
                  ),
                ),
              );
            }),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Reusable Card Shell
// ─────────────────────────────────────────────────────────────────────────────

class _CardShell extends StatelessWidget {
  final Widget child;

  const _CardShell({required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.06),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: child,
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Loading / error placeholder
// ─────────────────────────────────────────────────────────────────────────────

/// Shown until the first successful `GET /orders/{id}/track` response.
///
/// A failed load always offers a retry — the screen never sits blank.
class _TrackingPlaceholder extends StatelessWidget {
  const _TrackingPlaceholder({
    required this.isLoading,
    required this.error,
    required this.onRetry,
  });

  final bool isLoading;
  final ApiException? error;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFAF8FF),
      appBar: AppBar(
        backgroundColor: const Color(0xFFFAF8FF),
        elevation: 0,
        automaticallyImplyLeading: false,
        title: const Text('Order tracking'),
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: isLoading
              ? const CircularProgressIndicator()
              : Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      error?.kind == ApiErrorKind.network
                          ? Icons.wifi_off_rounded
                          : Icons.error_outline_rounded,
                      size: 52,
                      color: const Color(0xFFDC2626),
                    ),
                    const SizedBox(height: 16),
                    const Text(
                      'Could not load this order',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF131B2E),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      error?.message ?? 'Please try again.',
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                        color: Color(0xFF5C403C),
                      ),
                    ),
                    const SizedBox(height: 20),
                    FilledButton.icon(
                      onPressed: onRetry,
                      icon: const Icon(Icons.refresh_rounded, size: 18),
                      label: const Text('Try again'),
                    ),
                  ],
                ),
        ),
      ),
    );
  }
}
