import 'package:flutter/material.dart';

import '../../services/notification_service.dart';

/// Notifications feed reached from the dashboard bell icon.
///
/// Shows order updates, promos and alerts, with per-item read state, relative
/// timestamps and a "mark all read" action. Reactive via [NotificationService]
/// (a [ChangeNotifier]) so the badge outside this screen stays in sync.
class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  @override
  void initState() {
    super.initState();
    // The feed is derived from the customer's real orders (`GET /orders`) —
    // there is no notification backend to subscribe to, so every open refetches.
    NotificationService.instance.refresh();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: theme.colorScheme.surface,
      appBar: AppBar(
        backgroundColor: theme.colorScheme.surface,
        elevation: 0,
        title: const Text('Notifications'),
        actions: [
          AnimatedBuilder(
            animation: NotificationService.instance,
            builder: (context, _) {
              if (NotificationService.instance.unreadCount == 0) {
                return const SizedBox.shrink();
              }
              return TextButton(
                onPressed: NotificationService.instance.markAllAsRead,
                child: const Text('Mark all read'),
              );
            },
          ),
        ],
      ),
      body: AnimatedBuilder(
        animation: NotificationService.instance,
        builder: (context, _) {
          final notifications = NotificationService.instance.items;
          if (notifications.isEmpty) {
            // Show a spinner only before the first fetch has ever completed;
            // afterwards an empty feed is a real "nothing yet", not a load.
            if (!NotificationService.instance.hasLoaded) {
              return const Center(child: CircularProgressIndicator());
            }
            return const _EmptyNotificationsView();
          }

          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: notifications.length,
            separatorBuilder: (context, index) => const SizedBox(height: 10),
            itemBuilder: (context, index) {
              final notification = notifications[index];
              return Dismissible(
                key: ValueKey(notification.id),
                direction: DismissDirection.endToStart,
                background: Container(
                  alignment: Alignment.centerRight,
                  padding: const EdgeInsets.only(right: 20),
                  decoration: BoxDecoration(
                    color: theme.colorScheme.error,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: const Icon(Icons.delete_outline, color: Colors.white),
                ),
                onDismissed: (_) =>
                    NotificationService.instance.remove(notification.id),
                child: _NotificationTile(notification: notification),
              );
            },
          );
        },
      ),
    );
  }
}

class _EmptyNotificationsView extends StatelessWidget {
  const _EmptyNotificationsView();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.notifications_off_outlined,
              size: 72,
              color: theme.colorScheme.onSurfaceVariant.withValues(alpha: 0.5),
            ),
            const SizedBox(height: 16),
            Text(
              'No notifications yet',
              style: theme.textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              "Order updates will appear here as your orders move. Push "
              "notifications are not enabled yet.",
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

class _NotificationTile extends StatelessWidget {
  final AppNotification notification;

  const _NotificationTile({required this.notification});

  ({IconData icon, Color color, String label}) get _style {
    switch (notification.type) {
      case AppNotificationType.order:
        return (
          icon: Icons.delivery_dining_rounded,
          color: const Color(0xFF1D4ED8),
          label: 'Order',
        );
      case AppNotificationType.promo:
        return (
          icon: Icons.local_offer_rounded,
          color: const Color(0xFFF59E0B),
          label: 'Promo',
        );
      case AppNotificationType.alert:
        return (
          icon: Icons.campaign_rounded,
          color: const Color(0xFFDC2626),
          label: 'Alert',
        );
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final style = _style;

    return Material(
      color: notification.isRead
          ? theme.colorScheme.surfaceContainerLowest
          : theme.colorScheme.primaryContainer.withValues(alpha: 0.14),
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () => NotificationService.instance.markAsRead(notification.id),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color: style.color.withValues(alpha: 0.14),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(style.icon, color: style.color, size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            notification.title,
                            style: theme.textTheme.titleMedium?.copyWith(
                              fontWeight: notification.isRead
                                  ? FontWeight.w600
                                  : FontWeight.bold,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        if (!notification.isRead)
                          Container(
                            width: 8,
                            height: 8,
                            margin: const EdgeInsets.only(left: 6),
                            decoration: const BoxDecoration(
                              color: Color(0xFFDC2626),
                              shape: BoxShape.circle,
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      notification.body,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                        height: 1.35,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 7,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: style.color.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            style.label,
                            style: theme.textTheme.labelSmall?.copyWith(
                              color: style.color,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          notification.relativeTime(),
                          style: theme.textTheme.labelSmall?.copyWith(
                            color: theme.colorScheme.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
