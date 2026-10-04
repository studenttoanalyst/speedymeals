import 'package:flutter/material.dart';

import '../../core/network/api_exception.dart';
import '../../data/models/order_models.dart';
import '../../data/repositories/order_repository.dart';
import 'order_tracking_screen.dart';

/// The app's "Track" tab.
///
/// Replaces the hardcoded `OrderTrackingScreen(orderId: 'ORD-2024-001', …)`
/// placeholder with real data from `GET /orders`:
///
///  - if an order is still in flight, its live tracking screen is shown
///    immediately (that is what the tab is for);
///  - otherwise the customer's real order history is listed, and any row opens
///    that order's tracking screen.
class TrackOrdersTab extends StatefulWidget {
  const TrackOrdersTab({super.key});

  @override
  State<TrackOrdersTab> createState() => _TrackOrdersTabState();
}

class _TrackOrdersTabState extends State<TrackOrdersTab> {
  final _orderRepository = OrderRepository();

  List<OrderSummary> _orders = const [];
  bool _isLoading = true;
  ApiException? _error;

  /// Set when the customer explicitly picks a past order to view.
  String? _selectedOrderId;

  @override
  void initState() {
    super.initState();
    _loadOrders();
  }

  Future<void> _loadOrders() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final orders = await _orderRepository.history();
      if (!mounted) return;
      setState(() {
        _orders = orders;
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

  /// Order the tab should focus on: an explicit selection wins, then the newest
  /// in-flight order, then the newest order of any status.
  OrderSummary? get _focusedOrder {
    if (_orders.isEmpty) return null;

    final selectedId = _selectedOrderId;
    if (selectedId != null) {
      for (final order in _orders) {
        if (order.id == selectedId) return order;
      }
    }

    for (final order in _orders) {
      if (order.isActive) return order;
    }
    return _orders.first;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    if (_isLoading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    if (_error != null) {
      return Scaffold(
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  _error!.kind == ApiErrorKind.network
                      ? Icons.wifi_off_rounded
                      : Icons.error_outline_rounded,
                  size: 52,
                  color: theme.colorScheme.error,
                ),
                const SizedBox(height: 16),
                Text(
                  'Could not load your orders',
                  style: theme.textTheme.titleLarge
                      ?.copyWith(fontWeight: FontWeight.bold),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
                Text(
                  _error!.message,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 20),
                FilledButton.icon(
                  onPressed: _loadOrders,
                  icon: const Icon(Icons.refresh_rounded, size: 18),
                  label: const Text('Try again'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    final focused = _focusedOrder;
    if (focused == null) {
      return const _NoOrdersView();
    }

    // While an order is in flight, jump straight to its live tracking view.
    if (focused.isActive) {
      return OrderTrackingScreen(
        // Keyed by order id so switching orders rebuilds the polling state
        // instead of showing the previous order's data.
        key: ValueKey(focused.id),
        orderId: focused.id,
      );
    }

    return _OrderHistoryView(
      orders: _orders,
      onOpenOrder: (order) {
        setState(() => _selectedOrderId = order.id);
      },
      onRefresh: _loadOrders,
    );
  }
}

class _NoOrdersView extends StatelessWidget {
  const _NoOrdersView();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: theme.colorScheme.surface,
      body: Center(
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
                child: Icon(
                  Icons.receipt_long_outlined,
                  size: 46,
                  color: theme.colorScheme.primary,
                ),
              ),
              const SizedBox(height: 20),
              Text(
                'No orders yet',
                style: theme.textTheme.headlineSmall
                    ?.copyWith(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              Text(
                'Once you place an order you can follow it here from kitchen to '
                'doorstep.',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// The customer's real order history (`GET /orders`, newest first).
class _OrderHistoryView extends StatelessWidget {
  const _OrderHistoryView({
    required this.orders,
    required this.onOpenOrder,
    required this.onRefresh,
  });

  final List<OrderSummary> orders;
  final void Function(OrderSummary order) onOpenOrder;
  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: theme.colorScheme.surface,
      appBar: AppBar(
        backgroundColor: theme.colorScheme.surface,
        elevation: 0,
        automaticallyImplyLeading: false,
        title: const Text('Your Orders'),
        actions: [
          IconButton(
            onPressed: onRefresh,
            icon: const Icon(Icons.refresh_rounded),
            tooltip: 'Refresh',
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: onRefresh,
        child: ListView.separated(
          padding: const EdgeInsets.all(16),
          itemCount: orders.length,
          separatorBuilder: (context, index) => const SizedBox(height: 10),
          itemBuilder: (context, index) {
            final order = orders[index];
            return _OrderHistoryTile(
              order: order,
              onTap: () => onOpenOrder(order),
            );
          },
        ),
      ),
    );
  }
}

class _OrderHistoryTile extends StatelessWidget {
  const _OrderHistoryTile({required this.order, required this.onTap});

  final OrderSummary order;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDelivered = order.status.customerLabel == 'Delivered';

    return Card(
      margin: EdgeInsets.zero,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: theme.colorScheme.surfaceContainerHigh,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  isDelivered
                      ? Icons.check_circle_outline_rounded
                      : Icons.delivery_dining_rounded,
                  color: theme.colorScheme.primary,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      order.restaurantName,
                      style: theme.textTheme.titleMedium
                          ?.copyWith(fontWeight: FontWeight.bold),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '#${order.shortId} • ${_formatDate(order.placedAt)}',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${order.status.customerLabel} • '
                      '${order.paymentMethod.label}',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    order.totalLabel,
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: theme.colorScheme.primary,
                    ),
                  ),
                  const SizedBox(height: 4),
                  const Icon(Icons.chevron_right_rounded, size: 20),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  static String _formatDate(DateTime? value) {
    if (value == null) return '—';
    final day = value.day.toString().padLeft(2, '0');
    final month = value.month.toString().padLeft(2, '0');
    return '$day/$month/${value.year}';
  }
}
