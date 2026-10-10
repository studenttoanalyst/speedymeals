import 'package:flutter/material.dart';

import '../../core/network/api_exception.dart';
import '../../data/models/order_models.dart';
import '../../data/models/user_models.dart';
import '../../data/repositories/order_repository.dart';
import '../../data/repositories/user_repository.dart';
import '../../data/json_utils.dart';
import '../../services/cart_service.dart';
import '../checkout/checkout_screen.dart';

/// Cart screen backed by the backend's per-restaurant Redis cart.
///
/// Every price shown comes from the backend: line prices from the restaurant's
/// menu, and the delivery fee and total from
/// `GET /restaurants/{id}/cart/checkout-preview`. There is no platform fee and
/// no tax — the backend has neither, so the app must not invent them.
class CartScreen extends StatefulWidget {
  const CartScreen({super.key});

  @override
  State<CartScreen> createState() => _CartScreenState();
}

class _CartScreenState extends State<CartScreen> {
  final _userRepository = UserRepository();
  final _orderRepository = OrderRepository();

  /// Address the delivery fee is calculated against.
  UserAddress? _address;

  /// Backend-computed fee/total for the active cart. Null until it resolves —
  /// the UI shows the subtotal only until then rather than guessing a fee.
  CheckoutPreview? _preview;
  bool _isLoadingPreview = false;
  ApiException? _previewError;

  @override
  void initState() {
    super.initState();
    _bootstrap();
  }

  Future<void> _bootstrap() async {
    // Brings back whichever cart the customer was last using (the backend has
    // no "list my carts" endpoint to enumerate them).
    if (CartService.instance.restaurantId == null) {
      await CartService.instance.restorePersistedScope();
    }
    await _loadPreview();
  }

  /// Resolves the customer's delivery address, then asks the backend what the
  /// delivery fee and total would be for this cart.
  Future<void> _loadPreview() async {
    final restaurantId = CartService.instance.restaurantId;
    if (restaurantId == null || CartService.instance.isEmpty) {
      if (mounted) {
        setState(() {
          _preview = null;
          _previewError = null;
        });
      }
      return;
    }

    setState(() {
      _isLoadingPreview = true;
      _previewError = null;
    });

    try {
      _address ??= await _resolveAddress();
      final address = _address;

      if (address == null) {
        // No saved address: the backend requires one to price the delivery, so
        // say so instead of showing a made-up fee.
        if (mounted) {
          setState(() {
            _preview = null;
            _isLoadingPreview = false;
          });
        }
        return;
      }

      final preview = await _orderRepository.previewCheckout(
        restaurantId: restaurantId,
        addressId: address.id,
      );

      if (mounted) {
        setState(() {
          _preview = preview;
          _isLoadingPreview = false;
        });
      }
    } on ApiException catch (error) {
      if (mounted) {
        setState(() {
          _previewError = error;
          _isLoadingPreview = false;
        });
      }
    }
  }

  /// The customer's default address, else the most recently saved one.
  Future<UserAddress?> _resolveAddress() async {
    final addresses = await _userRepository.listAddresses();
    if (addresses.isEmpty) return null;
    for (final address in addresses) {
      if (address.isDefault) return address;
    }
    return addresses.first;
  }

  Future<void> _clearCart() async {
    await CartService.instance.clear();
    if (!mounted) return;

    ScaffoldMessenger.of(context)
      ..clearSnackBars()
      ..showSnackBar(
        const SnackBar(
          content: Text('Cart cleared'),
          behavior: SnackBarBehavior.floating,
        ),
      );
    await _loadPreview();
  }

  Future<void> _openCheckout() async {
    final address = _address ?? await _resolveAddress();
    if (!mounted) return;

    if (address == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Add a delivery address before checking out.'),
          backgroundColor: Color(0xFFDC2626),
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    _address = address;
    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => CheckoutScreen(address: address),
      ),
    );
    // The backend clears the cart on a successful order; re-read so the tab
    // reflects that instead of showing stale lines.
    await CartService.instance.refresh();
    await _loadPreview();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: theme.colorScheme.surface,
      appBar: AppBar(
        backgroundColor: theme.colorScheme.surface.withValues(alpha: 0.8),
        elevation: 0,
        automaticallyImplyLeading: false,
        title: const Text('My Cart'),
        actions: [
          AnimatedBuilder(
            animation: CartService.instance,
            builder: (context, _) {
              if (CartService.instance.isEmpty) return const SizedBox.shrink();
              return TextButton(
                onPressed: _clearCart,
                child: const Text('Clear'),
              );
            },
          ),
        ],
      ),
      body: AnimatedBuilder(
        animation: CartService.instance,
        builder: (context, _) {
          final cart = CartService.instance;

          if (cart.isLoading && cart.restaurantId == null) {
            return const Center(child: CircularProgressIndicator());
          }

          if (cart.hasError && cart.isEmpty) {
            return _CartErrorView(
              error: cart.error!,
              onRetry: () async {
                cart.clearError();
                await _bootstrap();
              },
            );
          }

          if (cart.isEmpty) return const _EmptyCartView();

          return _CartBody(
            cart: cart,
            preview: _preview,
            isLoadingPreview: _isLoadingPreview,
            previewError: _previewError,
            hasAddress: _address != null,
            onCheckout: _openCheckout,
            onRetryPreview: _loadPreview,
          );
        },
      ),
    );
  }
}

// ----------------------------- Empty state -----------------------------

class _EmptyCartView extends StatelessWidget {
  const _EmptyCartView();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

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
              child: Icon(
                Icons.shopping_bag_outlined,
                size: 46,
                color: theme.colorScheme.primary,
              ),
            ),
            const SizedBox(height: 20),
            Text(
              'Your cart is empty',
              style: theme.textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.bold,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              'Add items from a restaurant to get started.',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: () => Navigator.of(context).maybePop(),
                icon: const Icon(Icons.restaurant_menu, size: 18),
                label: const Text('Browse Restaurants'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ----------------------------- Error state -----------------------------

class _CartErrorView extends StatelessWidget {
  const _CartErrorView({required this.error, required this.onRetry});

  final ApiException error;
  final Future<void> Function() onRetry;

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
              error.kind == ApiErrorKind.network
                  ? Icons.wifi_off_rounded
                  : Icons.error_outline_rounded,
              size: 52,
              color: theme.colorScheme.error,
            ),
            const SizedBox(height: 16),
            Text(
              'Could not load your cart',
              style: theme.textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              error.message,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
              textAlign: TextAlign.center,
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
    );
  }
}

// ----------------------------- Populated state -----------------------------

class _CartBody extends StatelessWidget {
  const _CartBody({
    required this.cart,
    required this.preview,
    required this.isLoadingPreview,
    required this.previewError,
    required this.hasAddress,
    required this.onCheckout,
    required this.onRetryPreview,
  });

  final CartService cart;
  final CheckoutPreview? preview;
  final bool isLoadingPreview;
  final ApiException? previewError;
  final bool hasAddress;
  final Future<void> Function() onCheckout;
  final Future<void> Function() onRetryPreview;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      children: [
        if (cart.hasUnresolvedItems || cart.hasUnavailableItems)
          _CartWarningBanner(
            message: cart.hasUnresolvedItems
                ? 'Some items are no longer on this restaurant\'s menu. Remove '
                    'them to continue.'
                : 'Some items are sold out. Remove them to continue.',
          ),
        Expanded(
          child: ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: cart.lines.length,
            separatorBuilder: (context, index) => const SizedBox(height: 10),
            itemBuilder: (context, index) {
              final line = cart.lines[index];
              return _CartLineTile(
                line: line,
                isPending: cart.isItemPending(line.id),
              );
            },
          ),
        ),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: theme.colorScheme.surface,
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.1),
                blurRadius: 10,
                offset: const Offset(0, -2),
              ),
            ],
          ),
          child: SafeArea(
            top: false,
            child: Column(
              children: [
                _SummaryRow(
                  label: 'Subtotal',
                  value: formatPkr(cart.subtotal),
                ),
                const SizedBox(height: 6),
                if (preview != null) ...[
                  _SummaryRow(
                    label: 'Delivery Fee (${preview!.distanceLabel})',
                    value: preview!.deliveryFeeLabel,
                  ),
                  const SizedBox(height: 6),
                ] else
                  _DeliveryFeePendingRow(
                    isLoading: isLoadingPreview,
                    error: previewError,
                    hasAddress: hasAddress,
                    onRetry: onRetryPreview,
                  ),
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: theme.colorScheme.primaryContainer,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Total',
                        style: theme.textTheme.headlineSmall?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        // Only ever the backend's total; until it arrives the
                        // subtotal is shown with the fee still pending above.
                        preview?.totalLabel ?? formatPkr(cart.subtotal),
                        style: theme.textTheme.headlineMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: theme.colorScheme.primary,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: cart.isCheckoutBlocked ? null : onCheckout,
                    icon: const Icon(Icons.arrow_forward_rounded, size: 18, color: Colors.white),
                    label: const Text(
                      'Go to Checkout',
                      style: TextStyle(color: Colors.white),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

/// Shown while the delivery fee is unknown — never a placeholder amount.
class _DeliveryFeePendingRow extends StatelessWidget {
  const _DeliveryFeePendingRow({
    required this.isLoading,
    required this.error,
    required this.hasAddress,
    required this.onRetry,
  });

  final bool isLoading;
  final ApiException? error;
  final bool hasAddress;
  final Future<void> Function() onRetry;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    if (isLoading) {
      return Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            'Delivery Fee',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(
            width: 14,
            height: 14,
            child: CircularProgressIndicator(strokeWidth: 2),
          ),
        ],
      );
    }

    if (error != null) {
      return Row(
        children: [
          Expanded(
            child: Text(
              'Delivery fee unavailable: ${error!.message}',
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.error,
              ),
            ),
          ),
          TextButton(
            onPressed: onRetry,
            child: const Text('Retry'),
          ),
        ],
      );
    }

    return Text(
      hasAddress
          ? 'Delivery fee is calculated at checkout.'
          : 'Add a delivery address to see your delivery fee.',
      style: theme.textTheme.bodySmall?.copyWith(
        color: theme.colorScheme.onSurfaceVariant,
      ),
    );
  }
}

class _CartWarningBanner extends StatelessWidget {
  const _CartWarningBanner({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.fromLTRB(16, 12, 16, 0),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFFEF3C7),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFFDE68A)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(
            Icons.warning_amber_rounded,
            size: 18,
            color: Color(0xFFB45309),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              message,
              style: const TextStyle(
                fontSize: 12.5,
                fontWeight: FontWeight.w600,
                color: Color(0xFF92400E),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _CartLineTile extends StatelessWidget {
  const _CartLineTile({required this.line, this.isPending = false});

  final CartLine line;
  final bool isPending;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      margin: EdgeInsets.zero,
      child: Opacity(
        opacity: isPending ? 0.6 : 1,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  color: theme.colorScheme.surfaceContainerLow,
                  borderRadius: BorderRadius.circular(12),
                ),
                clipBehavior: Clip.antiAlias,
                child: (line.imageUrl != null && line.imageUrl!.isNotEmpty)
                    ? Image.network(
                        line.imageUrl!,
                        fit: BoxFit.cover,
                        errorBuilder: (context, error, stackTrace) => Icon(
                          Icons.restaurant,
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                      )
                    : Icon(
                        Icons.restaurant,
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      line.name,
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      line.restaurantName,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    if (!line.isAvailable) ...[
                      const SizedBox(height: 4),
                      Text(
                        'Sold out',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.error,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                    const SizedBox(height: 6),
                    Text(
                      formatPkr(line.lineTotal),
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: theme.colorScheme.primary,
                      ),
                    ),
                  ],
                ),
              ),
              Column(
                children: [
                  IconButton(
                    visualDensity: VisualDensity.compact,
                    icon: const Icon(Icons.delete_outline, size: 20),
                    onPressed: isPending
                        ? null
                        : () => CartService.instance.removeItem(line.id),
                  ),
                  const SizedBox(height: 4),
                  Container(
                    decoration: BoxDecoration(
                      color: theme.colorScheme.surfaceContainerLow,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        IconButton(
                          visualDensity: VisualDensity.compact,
                          icon: const Icon(Icons.remove, size: 16),
                          onPressed: isPending
                              ? null
                              : () => CartService.instance.decrement(line.id),
                        ),
                        Text(
                          '${line.quantity}',
                          style: theme.textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        IconButton(
                          visualDensity: VisualDensity.compact,
                          icon: const Icon(Icons.add, size: 16),
                          onPressed: isPending
                              ? null
                              : () => CartService.instance.increment(line.id),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SummaryRow extends StatelessWidget {
  const _SummaryRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: theme.textTheme.bodyMedium?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
        Text(
          value,
          style: theme.textTheme.bodyMedium?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
      ],
    );
  }
}
