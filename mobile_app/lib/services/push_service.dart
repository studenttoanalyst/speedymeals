import 'dart:async';
import 'dart:developer' as developer;

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

import '../data/repositories/device_repository.dart';
import 'notification_service.dart';

/// Background/terminated-state entry point. It must be a top-level function.
///
/// Messages the backend sends carry a `notification` payload, so the OS draws
/// them itself while the app is in the background or closed; nothing else is
/// needed here. Firebase is initialised so data-only handling can be added later.
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
}

/// Firebase Cloud Messaging for customers and riders.
///
/// Lifecycle:
///   * [init]                      once at startup (before `runApp`)
///   * [registerForCurrentSession] after a successful login / restored session
///   * [unregister]                before logout clears the session
///
/// Push is optional: if Firebase is not configured on this build (no
/// `google-services.json` / `GoogleService-Info.plist`, desktop, web) every
/// method becomes a silent no-op and the app keeps working with its in-app
/// notification feed.
class PushService {
  PushService._();

  static final PushService instance = PushService._();

  /// Android channel ids. They MUST match what the backend sends
  /// (`platform/notification/fcm.py`, `order_notifications.py`).
  static const String orderChannelId = 'order_updates';
  static const String riderChannelId = 'rider_assignments';

  final DeviceRepository _devices = DeviceRepository();
  final FlutterLocalNotificationsPlugin _local = FlutterLocalNotificationsPlugin();

  bool _initialised = false;
  bool _available = false;
  String? _registeredToken;
  StreamSubscription<String>? _tokenRefreshSub;

  /// True once Firebase initialised successfully on this build.
  bool get isAvailable => _available;

  final StreamController<Map<String, String>> _dataEvents =
      StreamController<Map<String, String>>.broadcast();

  /// The `data` payload of every push received while the app is running
  /// (foreground, or opened from a notification). Screens listen for their
  /// event type — e.g. `rider_account` — and refetch, so admin changes show
  /// up live.
  Stream<Map<String, String>> get dataEvents => _dataEvents.stream;

  void _emitData(RemoteMessage message) {
    if (message.data.isEmpty) return;
    _dataEvents.add(message.data.map((k, v) => MapEntry(k, '$v')));
  }

  // ------------------------------------------------------------------ setup

  Future<void> init() async {
    if (_initialised) return;
    _initialised = true;

    // The Flutter web build has no FCM configuration; push is mobile-only here.
    if (kIsWeb) return;

    try {
      // Reads google-services.json (Android) / GoogleService-Info.plist (iOS).
      await Firebase.initializeApp();
      FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);
      await _setUpLocalNotifications();

      FirebaseMessaging.onMessage.listen(_onForegroundMessage);
      FirebaseMessaging.onMessageOpenedApp.listen((message) {
        _emitData(message);
        _refreshInbox();
      });

      // iOS does not show notifications while the app is open unless asked to.
      await FirebaseMessaging.instance.setForegroundNotificationPresentationOptions(
        alert: true,
        badge: true,
        sound: true,
      );

      _available = true;
    } catch (error, stackTrace) {
      developer.log(
        'Push disabled: Firebase is not configured for this build.',
        name: 'PushService',
        error: error,
        stackTrace: stackTrace,
      );
    }
  }

  Future<void> _setUpLocalNotifications() async {
    await _local.initialize(
      settings: const InitializationSettings(
        android: AndroidInitializationSettings('@mipmap/launcher_icon'),
        iOS: DarwinInitializationSettings(
          requestAlertPermission: false,
          requestBadgePermission: false,
          requestSoundPermission: false,
        ),
      ),
      onDidReceiveNotificationResponse: (_) => _refreshInbox(),
    );

    final android = _local.resolvePlatformSpecificImplementation<
        AndroidFlutterLocalNotificationsPlugin>();
    await android?.createNotificationChannel(
      const AndroidNotificationChannel(
        orderChannelId,
        'Order updates',
        description: 'Status updates for your orders.',
        importance: Importance.high,
      ),
    );
    await android?.createNotificationChannel(
      const AndroidNotificationChannel(
        riderChannelId,
        'Delivery requests',
        description: 'New delivery requests and cancellations for riders.',
        importance: Importance.max,
      ),
    );
  }

  // ----------------------------------------------------------- session hooks

  /// Asks for notification permission, fetches this device's FCM token and
  /// registers it for the signed-in account. Safe to call repeatedly.
  Future<void> registerForCurrentSession() async {
    if (!_available) return;
    try {
      final permission = await FirebaseMessaging.instance.requestPermission();
      if (permission.authorizationStatus == AuthorizationStatus.denied) return;

      // On iOS the FCM token can be null until APNs is ready; onTokenRefresh
      // delivers it afterwards, so always listen.
      final token = await FirebaseMessaging.instance.getToken();
      if (token != null) await _register(token);

      _tokenRefreshSub ??= FirebaseMessaging.instance.onTokenRefresh.listen(_register);
    } catch (error, stackTrace) {
      developer.log('Push registration failed', name: 'PushService', error: error, stackTrace: stackTrace);
    }
  }

  /// Removes this device from the account and discards the FCM token, so the
  /// next person to sign in on this phone cannot receive the previous
  /// account's notifications. Call BEFORE the session is cleared (the backend
  /// call needs a valid access token). Never throws.
  Future<void> unregister() async {
    await _tokenRefreshSub?.cancel();
    _tokenRefreshSub = null;
    if (!_available) return;

    try {
      final token = _registeredToken ?? await FirebaseMessaging.instance.getToken();
      _registeredToken = null;
      if (token != null) {
        await _devices.unregister(token).timeout(const Duration(seconds: 5));
      }
    } catch (error) {
      developer.log('Push unregister failed (continuing logout): $error', name: 'PushService');
    }

    try {
      await FirebaseMessaging.instance.deleteToken();
    } catch (error) {
      developer.log('FCM deleteToken failed: $error', name: 'PushService');
    }
  }

  /// Drops this device's FCM token locally WITHOUT calling the backend.
  ///
  /// Used by account deletion: `DELETE /users/me` has already removed the
  /// server-side device rows, and the now-revoked access token would make a
  /// `DELETE /devices` call fail. This only deletes the on-device token so the
  /// next account that signs in on this phone starts clean. Never throws.
  Future<void> forgetDeviceToken() async {
    await _tokenRefreshSub?.cancel();
    _tokenRefreshSub = null;
    _registeredToken = null;
    if (!_available) return;
    try {
      await FirebaseMessaging.instance.deleteToken();
    } catch (error) {
      developer.log('FCM deleteToken failed: $error', name: 'PushService');
    }
  }

  // --------------------------------------------------------------- internals

  Future<void> _register(String token) async {
    try {
      await _devices.register(token: token, platform: _platformName());
      _registeredToken = token;
    } catch (error) {
      // No session yet / offline: the next login or token refresh retries.
      developer.log('Device token registration skipped: $error', name: 'PushService');
    }
  }

  String _platformName() =>
      defaultTargetPlatform == TargetPlatform.iOS ? 'ios' : 'android';

  Future<void> _onForegroundMessage(RemoteMessage message) async {
    // Keep the in-app feed and any open order screens current.
    _refreshInbox();
    _emitData(message);

    // iOS presents foreground notifications natively (see init); only Android
    // needs a local notification to make the message visible while the app is open.
    if (defaultTargetPlatform != TargetPlatform.android) return;

    final notification = message.notification;
    if (notification == null) return;

    final channelId = notification.android?.channelId ?? orderChannelId;
    final isRiderChannel = channelId == riderChannelId;

    await _local.show(
      id: message.hashCode,
      title: notification.title,
      body: notification.body,
      notificationDetails: NotificationDetails(
        android: AndroidNotificationDetails(
          channelId,
          isRiderChannel ? 'Delivery requests' : 'Order updates',
          importance: isRiderChannel ? Importance.max : Importance.high,
          priority: Priority.high,
        ),
      ),
      payload: message.data['order_id'],
    );
  }

  void _refreshInbox() {
    unawaited(NotificationService.instance.refresh());
  }
}
