import 'package:flutter/material.dart';

import '../../core/constants/app_constants.dart' show PaymentMethod;
import '../../core/network/api_exception.dart';
import '../../data/json_utils.dart';
import '../../data/models/order_models.dart';
import '../../data/models/user_models.dart';
import '../../data/repositories/order_repository.dart';
import '../../data/repositories/user_repository.dart';
import '../../services/cart_service.dart';
import '../../widgets/gst_note.dart';
import '../tracking/order_tracking_screen.dart';

/// Checkout screen — delivery address, order lines, payment method and totals.
///
/// Every amount on this screen comes from
/// `GET /restaurants/{id}/cart/checkout-preview`, and the order is placed with
/// `POST /restaurants/{id}/cart/checkout`. The client sends an address id and a
/// payment method and nothing else: prices, the delivery fee, commission and the
/// rider's earning are all computed and frozen server-side.
///
/// Only `COD` and `Digital` are offered, because those are the only two values
/// the backend accepts (`VALID_PAYMENT_METHODS`).
class CheckoutScreen extends StatefulWidget {
  const CheckoutScreen({super.key, required this.address});

  /// Selected delivery address. The backend requires one to price the delivery.
  final UserAddress address;

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  final _orderRepository = OrderRepository();
  final _userRepository = UserRepository();

  late UserAddress _address;

  PaymentMethod _paymentMethod = PaymentMethod.cod;

  CheckoutPreview? _preview;
  bool _isLoadingPreview = true;
  ApiException? _previewError;

  /// Guards against double-taps producing duplicate orders.
  bool _isPlacingOrder = false;

  @override
  void initState() {
    super.initState();
    _address = widget.address;
    _loadPreview();
  }

  String? get _restaurantId => CartService.instance.restaurantId;

  Future<void> _loadPreview() async {
    final restaurantId = _restaurantId;
    if (restaurantId == null) {
      setState(() {
        _isLoadingPreview = false;
        _previewError = const ApiException(
          kind: ApiErrorKind.badRequest,
          message: 'Your cart is empty. Add items before checking out.',
        );
      });
      return;
    }

    setState(() {
      _isLoadingPreview = true;
      _previewError = null;
    });

    try {
      final preview = await _orderRepository.previewCheckout(
        restaurantId: restaurantId,
        addressId: _address.id,
      );
      if (!mounted) return;
      setState(() {
        _preview = preview;
        _isLoadingPreview = false;
        // If the backend just told us online payments are off, snap an
        // invalid Digital selection back to COD so the place-order button
        // can never submit a method the server will reject with 400.
        if (!preview.onlinePaymentsEnabled &&
            _paymentMethod == PaymentMethod.digital) {
          _paymentMethod = PaymentMethod.cod;
        }
      });
    } on ApiException catch (error) {
      if (!mounted) return;
      setState(() {
        _previewError = error;
        _isLoadingPreview = false;
      });
    }
  }

  /// Real order placement. The cart is only cleared locally after the backend
  /// confirms the order (it clears its own copy inside the same operation).
  Future<void> _placeOrder() async {
    if (_isPlacingOrder) return;

    final restaurantId = _restaurantId;
    if (restaurantId == null) return;

    setState(() => _isPlacingOrder = true);

    try {
      final placed = await _orderRepository.placeOrder(
        restaurantId: restaurantId,
        request: PlaceOrderRequest(
          addressId: _address.id,
          paymentMethod: _paymentMethod,
          expectedTotal: _preview?.total,
        ),
      );

      CartService.instance.resetAfterCheckout();

      if (!mounted) return;

      // Straight to live tracking for the REAL order id the backend returned.
      await Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (context) => OrderTrackingScreen(orderId: placed.id),
        ),
      );
    } on ApiException catch (error) {
      if (!mounted) return;

      // Price-tamper guard: the backend re-prices every line at placement and
      // rejects with 409 when the sent `expected_total` no longer matches
      // (`food_delivery/service.py`). Never auto-retry — show a friendly
      // message, re-fetch the preview so the customer sees the NEW total and
      // GST, and let them place the order again themselves.
      if (error.kind == ApiErrorKind.conflict) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'Prices changed while you were checking out. Please review the '
              'updated total and place your order again.',
            ),
            backgroundColor: Color(0xFFDC2626),
            behavior: SnackBarBehavior.floating,
          ),
        );
        await _loadPreview();
        return;
      }

      // Defence-in-depth 400: online payments disabled server-side
      // (ONLINE_PAYMENTS_ENABLED=false). The option is hidden from the UI
      // normally, so this only fires if a stale client still tries Digital —
      // fall back to COD cleanly instead of showing a raw error.
      if (error.statusCode == 400 &&
          _paymentMethod == PaymentMethod.digital) {
        setState(() => _paymentMethod = PaymentMethod.cod);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'Online payment is currently unavailable. '
              'Please choose Cash on Delivery.',
            ),
            backgroundColor: Color(0xFFDC2626),
            behavior: SnackBarBehavior.floating,
          ),
        );
        await _loadPreview();
        return;
      }

      // 402 means the (stubbed) digital gateway declined — tell the customer
      // what to do about it rather than showing a raw error.
      final message = error.kind == ApiErrorKind.unavailable
          ? 'We could not reach the delivery distance service. Please try again shortly.'
          : error.message;

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            error.statusCode == 402
                ? 'Online payment failed. Choose Cash on Delivery and try again.'
                : message,
          ),
          backgroundColor: const Color(0xFFDC2626),
          behavior: SnackBarBehavior.floating,
        ),
      );
    } finally {
      if (mounted) setState(() => _isPlacingOrder = false);
    }
  }

  /// Lets the customer switch to another saved address, then re-prices.
  Future<void> _changeAddress() async {
    List<UserAddress> addresses;
    try {
      addresses = await _userRepository.listAddresses();
    } on ApiException catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(error.message),
          backgroundColor: const Color(0xFFDC2626),
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    if (!mounted) return;

    if (addresses.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('You have no other saved addresses.'),
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    final selected = await showModalBottomSheet<UserAddress>(
      context: context,
      showDragHandle: true,
      builder: (context) => SafeArea(
        child: ListView(
          shrinkWrap: true,
          children: [
            const Padding(
              padding: EdgeInsets.fromLTRB(20, 4, 20, 12),
              child: Text(
                'Deliver to',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
            ),
            for (final address in addresses)
              ListTile(
                leading: const Icon(Icons.location_on_outlined),
                title: Text(address.displayTitle),
                subtitle: Text(address.displaySubtitle),
                trailing: address.id == _address.id
                    ? const Icon(Icons.check_circle, color: Color(0xFF1D4ED8))
                    : null,
                onTap: () => Navigator.of(context).pop(address),
              ),
          ],
        ),
      ),
    );

    if (selected == null || selected.id == _address.id) return;

    setState(() => _address = selected);
    await _loadPreview();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final cart = CartService.instance;

    return Scaffold(
      backgroundColor: theme.colorScheme.surface,
      appBar: AppBar(
        backgroundColor: theme.colorScheme.surface.withValues(alpha: 0.8),
        elevation: 0,
        title: const Text('Checkout'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      // NOTE: This intentionally uses `SafeArea > Column > Expanded` instead of
      // wrapping the whole body in a SingleChildScrollView. An `Expanded`
      // inside an unbounded (scrolling) Column throws a RenderFlex assertion,
      // which rendered the blank/white checkout screen.
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Delivery Address Card
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                const Icon(Icons.location_on,
                                    color: Color(0xFF1D4ED8), size: 20),
                                const SizedBox(width: 8),
                                Text(
                                  'Delivery Address',
                                  style: theme.textTheme.headlineSmall,
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),
                            Container(
                              width: double.infinity,
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: theme.colorScheme.surfaceContainerLow,
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      const Icon(Icons.home,
                                          size: 16,
                                          color: Color(0xFF5C403C)),
                                      const SizedBox(width: 6),
                                      Expanded(
                                        child: Text(
                                          _address.displayTitle,
                                          style: const TextStyle(
                                              fontWeight: FontWeight.bold),
                                        ),
                                      ),
                                      if (_address.isDefault)
                                        const Text(
                                          'Default',
                                          style: TextStyle(
                                            fontSize: 11,
                                            fontWeight: FontWeight.w700,
                                            color: Color(0xFF1D4ED8),
                                          ),
                                        ),
                                    ],
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    _address.displaySubtitle,
                                    style: theme.textTheme.bodyMedium?.copyWith(
                                        color: theme.colorScheme.onSurface
                                            .withValues(alpha: 0.7)),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(height: 8),
                            TextButton(
                              onPressed: _changeAddress,
                              child: const Text('Change Address'),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Order Items
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Order Items',
                          style: theme.textTheme.headlineSmall,
                        ),
                        Text(
                          '${cart.itemCount} item${cart.itemCount == 1 ? '' : 's'}',
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: theme.colorScheme.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    if (cart.isEmpty)
                      Card(
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Row(
                            children: [
                              const Icon(Icons.info_outline, size: 18),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  'Your cart is empty.',
                                  style: theme.textTheme.bodyMedium,
                                ),
                              ),
                            ],
                          ),
                        ),
                      )
                    else
                      for (final line in cart.lines)
                        _OrderItemCard(
                          name: line.name,
                          quantity: line.quantity,
                          price: line.lineTotal,
                          imageUrl: line.imageUrl,
                        ),
                    const SizedBox(height: 24),

                    // Payment Method
                    Text(
                      'Payment Method',
                      style: theme.textTheme.headlineSmall,
                    ),
                    const SizedBox(height: 8),
                    _PaymentMethodCard(
                      title: 'Cash on Delivery',
                      subtitle: 'Pay the rider when your order arrives',
                      icon: Icons.account_balance_wallet,
                      isSelected: _paymentMethod == PaymentMethod.cod,
                      onTap: () {
                        setState(() => _paymentMethod = PaymentMethod.cod);
                      },
                    ),
                    const SizedBox(height: 8),
                    // Shown ONLY when the backend says online payments are
                    // live (`checkout-preview.online_payments_enabled`,
                    // governed by ONLINE_PAYMENTS_ENABLED). Default is false
                    // because the gateway is still a stub — selling a payment
                    // method that collects no money would be a broken promise.
                    // Fail-safe: while the preview is loading or errored the
                    // option stays hidden (COD-only).
                    if (_preview?.onlinePaymentsEnabled == true) ...[
                      _PaymentMethodCard(
                        title: PaymentMethod.digital.label,
                        subtitle: 'Pay online for this order',
                        icon: Icons.smartphone,
                        isSelected: _paymentMethod == PaymentMethod.digital,
                        onTap: () {
                          setState(
                              () => _paymentMethod = PaymentMethod.digital);
                        },
                      ),
                    ],
                  ],
                ),
              ),
            ),

            // Order Summary Bar
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
                child: Column(
                  children: [
                    if (_isLoadingPreview)
                      const Padding(
                        padding: EdgeInsets.symmetric(vertical: 20),
                        child: CircularProgressIndicator(),
                      )
                    else if (_previewError != null)
                      _PreviewErrorBlock(
                        error: _previewError!,
                        onRetry: _loadPreview,
                      )
                    else if (_preview != null) ...[
                      _SummaryRow(
                        label: 'Subtotal',
                        value: _preview!.foodSubtotalLabel,
                      ),
                      const SizedBox(height: 6),
                      // Exclusive GST: added on top of the food subtotal, so
                      // the rows sum exactly to the backend `total`.
                      if (_preview!.hasGst && !_preview!.pricesIncludeGst) ...[
                        _SummaryRow(
                          label: _preview!.gstRowLabel,
                          value: _preview!.gstAmountLabel,
                        ),
                        const SizedBox(height: 6),
                      ],
                      _SummaryRow(
                        label: 'Delivery Fee',
                        value: _preview!.deliveryFeeLabel,
                      ),
                      const SizedBox(height: 6),
                      _SummaryRow(
                        label: 'Platform Fee',
                        value: _preview!.platformFeeLabel,
                      ),
                      const SizedBox(height: 6),
                      // Inclusive GST: already inside food prices — note only.
                      if (_preview!.hasGst && _preview!.pricesIncludeGst) ...[
                        GstNote(text: _preview!.gstIncludedNote),
                        const SizedBox(height: 6),
                      ],
                      Align(
                        alignment: Alignment.centerLeft,
                        child: Text(
                          'Delivery distance: ${_preview!.distanceLabel}',
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: theme.colorScheme.onSurfaceVariant,
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                      Container(
                        width: double.infinity,
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
                                color: Colors.white,
                              ),
                            ),
                            Text(
                              _preview!.totalLabel,
                              style: theme.textTheme.headlineMedium?.copyWith(
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                    const SizedBox(height: 16),
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton(
                        onPressed: (_isPlacingOrder ||
                                _preview == null ||
                                cart.isCheckoutBlocked)
                            ? null
                            : _placeOrder,
                        child: _isPlacingOrder
                            ? const SizedBox(
                                width: 22,
                                height: 22,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2.5,
                                  color: Colors.white,
                                ),
                              )
                            : const Text(
                                'Place Order',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                ),
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
    );
  }
}

/// Shown when the backend could not compute the delivery fee (e.g. the Maps
/// dependency returned 503, or there is no address).
class _PreviewErrorBlock extends StatelessWidget {
  const _PreviewErrorBlock({required this.error, required this.onRetry});

  final ApiException error;
  final Future<void> Function() onRetry;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFFEF2F2),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFFEE2E2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(Icons.error_outline_rounded,
                  size: 18, color: Color(0xFFDC2626)),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  error.message,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: const Color(0xFF991B1B),
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
          if (error.isRetryable)
            Align(
              alignment: Alignment.centerRight,
              child: TextButton(
                onPressed: onRetry,
                child: const Text('Retry'),
              ),
            ),
        ],
      ),
    );
  }
}

class _OrderItemCard extends StatelessWidget {
  final String name;
  final int quantity;
  final double price;
  final String? imageUrl;

  const _OrderItemCard({
    required this.name,
    required this.quantity,
    required this.price,
    this.imageUrl,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            Container(
              width: 120,
              height: 80,
              clipBehavior: Clip.antiAlias,
              decoration: BoxDecoration(
                color: theme.colorScheme.surfaceContainerLow,
                borderRadius: BorderRadius.circular(8),
              ),
              child: (imageUrl != null && imageUrl!.isNotEmpty)
                  ? Image.network(
                      imageUrl!,
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) => const Center(
                        child: Icon(Icons.restaurant,
                            size: 32, color: Color(0xFF5C403C)),
                      ),
                    )
                  : const Center(
                      child: Icon(Icons.restaurant,
                          size: 32, color: Color(0xFF5C403C)),
                    ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    name,
                    style: theme.textTheme.bodyLarge?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Qty: $quantity',
                    style: theme.textTheme.bodySmall,
                  ),
                ],
              ),
            ),
            Text(
              formatPkr(price),
              style: theme.textTheme.bodyLarge?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _PaymentMethodCard extends StatelessWidget {
  final String title;
  final String subtitle;
  final IconData icon;
  final bool isSelected;
  final VoidCallback onTap;

  const _PaymentMethodCard({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      color: isSelected
          ? theme.colorScheme.primaryContainer.withValues(alpha: 0.3)
          : theme.colorScheme.surfaceContainerLowest,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: isSelected
                      ? theme.colorScheme.primaryContainer
                      : theme.colorScheme.surfaceContainerLow,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(
                  icon,
                  color: isSelected
                      ? theme.colorScheme.primary
                      : theme.colorScheme.onSurfaceVariant,
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: theme.textTheme.bodyLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Text(
                      subtitle,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
              if (isSelected)
                const Icon(
                  Icons.check_circle,
                  color: Color(0xFF1D4ED8),
                  size: 24,
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SummaryRow extends StatelessWidget {
  final String label;
  final String value;

  const _SummaryRow({
    required this.label,
    required this.value,
  });

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
