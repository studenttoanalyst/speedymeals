import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../core/constants/app_constants.dart';
import '../core/network/api_exception.dart';
import '../data/models/order_models.dart';
import '../data/repositories/order_repository.dart';

/// Category of an in-app notification.
enum AppNotificationType { order, promo, alert }

/// A single notification rendered on the notifications screen.
@immutable
class AppNotification {
  final String id;
  final String title;
  final String body;
  final DateTime timestamp;
  final AppNotificationType type;
  final bool isRead;

  const AppNotification({
    required this.id,
    required this.title,
    required this.body,
    required this.timestamp,
    required this.type,
    this.isRead = false,
  });

  AppNotification copyWith({bool? isRead}) {
    return AppNotification(
      id: id,
      title: title,
      body: body,
      timestamp: timestamp,
      type: type,
      isRead: isRead ?? this.isRead,
    );
  }

  /// Short relative time label ("2m ago", "3h ago", "2d ago").
  String relativeTime([DateTime? now]) {
    final reference = now ?? DateTime.now();
    final difference = reference.difference(timestamp);
    if (difference.inMinutes < 1) return 'Just now';
    if (difference.inMinutes < 60) return '${difference.inMinutes}m ago';
    if (difference.inHours < 24) return '${difference.inHours}h ago';
    return '${difference.inDays}d ago';
  }
}

/// In-app notification feed for the app.
///
/// IMPORTANT — where these come from: the backend has **no notifications
/// service** (no notifications table, no device-token registration, no FCM/APNs).
/// That is a spec-sanctioned MVP deferral (`push notifications — in-app status
/// refresh is enough for MVP`). So rather than invent notifications, this
/// service DERIVES them from the customer's real orders (`GET /orders`), which
/// is the polling data the app already has. Push notifications remain a future
/// backend feature.
///
/// Read/dismissed state is kept locally (SharedPreferences) keyed by a stable
/// per-(order, status) id, so a status change produces a new unread entry while
/// the read history is preserved across restarts.
class NotificationService extends ChangeNotifier {
  NotificationService._internal();

  /// Singleton instance used across the app.
  static final NotificationService instance = NotificationService._internal();

  final OrderRepository _orders = OrderRepository();

  List<AppNotification> _items = const [];
  final Set<String> _readIds = <String>{};
  final Set<String> _dismissedIds = <String>{};

  bool _isLoading = false;
  bool _hasLoaded = false;

  static const String _prefsReadKey = 'sm.notifications.read';
  static const String _prefsDismissedKey = 'sm.notifications.dismissed';

  /// Newest-first immutable view of the feed.
  List<AppNotification> get items => List.unmodifiable(_items);

  /// Number of notifications the user has not read yet.
  int get unreadCount => _items.where((n) => !n.isRead).length;

  /// Whether there is anything to show.
  bool get isEmpty => _items.isEmpty;

  bool get isLoading => _isLoading;

  /// True once a backend fetch has completed at least once (success or not),
  /// so the UI can distinguish "no updates" from "not loaded yet".
  bool get hasLoaded => _hasLoaded;

  /// Rebuilds the feed from the customer's real orders.
  ///
  /// Safe to call with no session or no network: failures leave the last known
  /// feed in place and never fabricate an entry.
  Future<void> refresh() async {
    _isLoading = true;
    notifyListeners();

    try {
      await _loadLocalState();
      final orders = await _orders.history();
      _items = _buildFeed(orders);
    } on ApiException catch (error) {
      // Unauthenticated (rider/guest) or offline: keep whatever we had.
      debugPrint('Notification refresh skipped: ${error.kind.name}');
    } catch (error) {
      debugPrint('Notification refresh failed: $error');
    } finally {
      _isLoading = false;
      _hasLoaded = true;
      notifyListeners();
    }
  }

  /// Marks a single notification as read.
  void markAsRead(String id) {
    if (_readIds.contains(id)) return;
    _readIds.add(id);
    _items = [
      for (final item in _items)
        item.id == id ? item.copyWith(isRead: true) : item,
    ];
    notifyListeners();
    _persistLocalState();
  }

  /// Marks every notification as read.
  void markAllAsRead() {
    if (unreadCount == 0) return;
    for (final item in _items) {
      _readIds.add(item.id);
    }
    _items = [for (final item in _items) item.copyWith(isRead: true)];
    notifyListeners();
    _persistLocalState();
  }

  /// Removes a single notification and remembers the dismissal so a later
  /// refresh does not bring it back.
  void remove(String id) {
    final lengthBefore = _items.length;
    _dismissedIds.add(id);
    _items = _items.where((n) => n.id != id).toList(growable: false);
    if (_items.length != lengthBefore) {
      notifyListeners();
      _persistLocalState();
    }
  }

  /// Clears the feed in memory (used on sign-out).
  void clear() {
    _items = const [];
    notifyListeners();
  }

  // ------------------------------------------------------------- internals

  List<AppNotification> _buildFeed(List<OrderSummary> orders) {
    final feed = <AppNotification>[];

    for (final order in orders) {
      final id = 'order:${order.id}:${order.status.wireValue}';
      if (_dismissedIds.contains(id)) continue;

      final copy = _copyFor(order);
      final timestamp = order.status == OrderStatus.delivered
          ? order.placedAt ?? DateTime.now()
          : order.placedAt ?? DateTime.now();

      feed.add(
        AppNotification(
          id: id,
          title: copy.$1,
          body: copy.$2,
          timestamp: timestamp,
          type: copy.$3,
          isRead: _readIds.contains(id),
        ),
      );
    }

    feed.sort((a, b) => b.timestamp.compareTo(a.timestamp));
    return feed;
  }

  /// (title, body, type) describing an order's current status.
  (String, String, AppNotificationType) _copyFor(OrderSummary order) {
    final restaurant = order.restaurantName;
    switch (order.status) {
      case OrderStatus.accepted:
        return ('Order confirmed', '$restaurant accepted your order.', AppNotificationType.order);
      case OrderStatus.preparing:
        return ('Preparing your food', '$restaurant is cooking your order now.', AppNotificationType.order);
      case OrderStatus.readyForPickup:
        return ('Ready for pickup', 'Your $restaurant order is ready for a rider.', AppNotificationType.order);
      case OrderStatus.riderAssigned:
        return ('Rider assigned', 'A rider is being assigned to your $restaurant order.', AppNotificationType.order);
      case OrderStatus.rejected:
        return ('Finding another rider', 'We are reassigning your $restaurant order to a new rider.', AppNotificationType.alert);
      case OrderStatus.acceptedByRider:
        return ('Rider on the way', 'Your rider is heading to $restaurant.', AppNotificationType.order);
      case OrderStatus.arrivedAtRestaurant:
        return ('Rider at the restaurant', 'Your rider has arrived at $restaurant.', AppNotificationType.order);
      case OrderStatus.pickedUp:
        return ('Order picked up', 'Your $restaurant order has been picked up.', AppNotificationType.order);
      case OrderStatus.onTheWay:
        return ('On the way', 'Your $restaurant order is on its way to you.', AppNotificationType.order);
      case OrderStatus.delivered:
        return ('Order delivered', 'Enjoy your meal from $restaurant! Tap to rate your experience.', AppNotificationType.order);
      case OrderStatus.cancelled:
        return ('Order cancelled', 'Your $restaurant order was cancelled.', AppNotificationType.alert);
      case OrderStatus.unknown:
        return ('Order update', 'Your $restaurant order has a new update.', AppNotificationType.order);
    }
  }

  Future<void> _loadLocalState() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final read = prefs.getStringList(_prefsReadKey);
      final dismissed = prefs.getStringList(_prefsDismissedKey);
      if (read != null) {
        _readIds
          ..clear()
          ..addAll(read);
      }
      if (dismissed != null) {
        _dismissedIds
          ..clear()
          ..addAll(dismissed);
      }
    } catch (error) {
      debugPrint('Could not read notification state: $error');
    }
  }

  Future<void> _persistLocalState() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setStringList(_prefsReadKey, _readIds.toList());
      await prefs.setStringList(_prefsDismissedKey, _dismissedIds.toList());
    } catch (error) {
      debugPrint('Could not persist notification state: $error');
    }
  }
}
