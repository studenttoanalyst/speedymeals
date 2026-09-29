import 'package:flutter/material.dart';

import '../../core/network/api_exception.dart';
import '../../data/json_utils.dart';
import '../../data/repositories/restaurant_repository.dart';
import '../../models/restaurant.dart';
import '../../services/cart_service.dart';
import '../cart/cart_screen.dart';

/// Restaurant & Menu Detail Screen matching the Stitch UI design.
///
/// Dynamically renders selected restaurant details, offer banners, sticky category tabs,
/// menu items with tags and rating overlays, and a sticky bottom cart bar without overflow.
class RestaurantDetailScreen extends StatefulWidget {
  final Restaurant restaurant;

  const RestaurantDetailScreen({
    super.key,
    required this.restaurant,
  });

  @override
  State<RestaurantDetailScreen> createState() => _RestaurantDetailScreenState();
}

class _RestaurantDetailScreenState extends State<RestaurantDetailScreen> {
  final RestaurantRepository _restaurantRepository = RestaurantRepository();

  bool _isFavorite = false;
  int _selectedCategoryIndex = 0;

  /// Per-item counters shown as the "add" badges. Kept locally (the backend
  /// cart is the real source of truth for the Cart tab and totals) so the design
  /// can confirm a tap instantly.
  final Map<String, int> _cartItems = {};

  /// Real menu for this restaurant, fetched from
  /// `GET /restaurants/{id}/menu`. Seeded from whatever the caller passed in,
  /// then replaced by the authoritative response.
  late List<RestaurantMenuCategory> _categories;
  bool _isLoadingMenu = false;
  ApiException? _menuError;

  @override
  void initState() {
    super.initState();
    _categories = widget.restaurant.categories;
    // The sticky cart bar reflects the shared backend cart, so it stays correct
    // even when lines are changed from the Cart tab.
    CartService.instance.addListener(_onCartChanged);
    _loadMenu();
  }

  @override
  void dispose() {
    CartService.instance.removeListener(_onCartChanged);
    super.dispose();
  }

  void _onCartChanged() {
    if (mounted) setState(() {});
  }

  /// Units currently in the backend cart for this restaurant.
  int get _cartCount => CartService.instance.itemCount;

  /// Backend menu prices for those units (delivery fee is added at checkout).
  double get _cartTotal => CartService.instance.subtotal;

  /// Loads this restaurant's real menu.
  ///
  /// The screen is always given a restaurant id, so the menu it shows is always
  /// the one belonging to the restaurant the customer tapped — never a shared
  /// or hardcoded list.
  Future<void> _loadMenu() async {
    final restaurantId = widget.restaurant.id;
    if (restaurantId.isEmpty) {
      setState(() => _menuError = const ApiException(
            kind: ApiErrorKind.badRequest,
            message: 'This restaurant could not be identified.',
          ));
      return;
    }

    setState(() {
      _isLoadingMenu = true;
      _menuError = null;
    });

    try {
      final menu = await _restaurantRepository.menu(restaurantId);
      if (!mounted) return;
      setState(() {
        _categories = [
          for (final category in menu)
            RestaurantMenuCategory.fromBackend(category),
        ];
        _isLoadingMenu = false;
      });
    } on ApiException catch (error) {
      if (!mounted) return;
      setState(() {
        _menuError = error;
        _isLoadingMenu = false;
      });
    }
  }

  Future<void> _addToCart(RestaurantMenuItem item) async {
    if (!item.isAvailable) return;

    setState(() {
      _cartItems[item.id] = (_cartItems[item.id] ?? 0) + 1;
    });

    // Writes to the real per-restaurant cart on the backend.
    await CartService.instance.addItem(
      restaurantId: widget.restaurant.id,
      item: item.toBackendMenuItem(),
      restaurantName: widget.restaurant.name,
    );

    if (!mounted) return;

    // Surface a failed add instead of leaving the badge lying about it.
    final error = CartService.instance.error;
    if (error != null) {
      setState(() {
        final count = (_cartItems[item.id] ?? 1) - 1;
        if (count <= 0) {
          _cartItems.remove(item.id);
        } else {
          _cartItems[item.id] = count;
        }
      });
      ScaffoldMessenger.of(context).clearSnackBars();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(error.message),
          backgroundColor: const Color(0xFFDC2626),
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    ScaffoldMessenger.of(context).clearSnackBars();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('${item.name} added to cart!'),
        duration: const Duration(seconds: 1),
        backgroundColor: const Color(0xFFDC2626),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final restaurant = widget.restaurant;
    final categories = _categories;

    if (_isLoadingMenu && categories.isEmpty) {
      return Scaffold(
        backgroundColor: const Color(0xFFFAF8FF),
        appBar: AppBar(
          backgroundColor: const Color(0xFFFAF8FF),
          elevation: 0,
          title: Text(restaurant.name),
        ),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (_menuError != null && categories.isEmpty) {
      return Scaffold(
        backgroundColor: const Color(0xFFFAF8FF),
        appBar: AppBar(
          backgroundColor: const Color(0xFFFAF8FF),
          elevation: 0,
          title: Text(restaurant.name),
        ),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.error_outline_rounded,
                    size: 52, color: Color(0xFFDC2626)),
                const SizedBox(height: 16),
                const Text(
                  'Could not load the menu',
                  style: TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF131B2E),
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  _menuError!.message,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 13,
                    color: Color(0xFF5C403C),
                  ),
                ),
                const SizedBox(height: 20),
                FilledButton.icon(
                  onPressed: _loadMenu,
                  icon: const Icon(Icons.refresh_rounded, size: 18),
                  label: const Text('Try again'),
                ),
              ],
            ),
          ),
        ),
      );
    }
    final currentCategory = categories.isNotEmpty && _selectedCategoryIndex < categories.length
        ? categories[_selectedCategoryIndex]
        : null;

    return Scaffold(
      backgroundColor: const Color(0xFFFAF8FF),
      appBar: AppBar(
        backgroundColor: const Color(0xFFFAF8FF).withValues(alpha: 0.95),
        elevation: 0,
        scrolledUnderElevation: 1,
        shadowColor: Colors.black.withValues(alpha: 0.08),
        leading: IconButton(
          icon: const Icon(
            Icons.arrow_back_ios_new,
            size: 20,
            color: Color(0xFF131B2E),
          ),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text(
          restaurant.name,
          style: theme.textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.bold,
            color: const Color(0xFF131B2E),
            fontSize: 17,
          ),
          overflow: TextOverflow.ellipsis,
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 16),
            child: CircleAvatar(
              radius: 16,
              backgroundColor: const Color(0xFFDC2626).withValues(alpha: 0.1),
              child: ClipOval(
                child: Image.asset(
                  'assets/images/new logo.png',
                  width: 28,
                  height: 28,
                  fit: BoxFit.cover,
                  errorBuilder: (context, error, stackTrace) => Image.asset(
                    'assets/images/logo.png',
                    width: 28,
                    height: 28,
                    fit: BoxFit.cover,
                    errorBuilder: (c, e, s) => const Icon(
                      Icons.fastfood,
                      size: 18,
                      color: Color(0xFFDC2626),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
      body: Stack(
        children: [
          SingleChildScrollView(
            padding: EdgeInsets.only(bottom: _cartCount > 0 ? 90 : 32),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // 1. Hero Image Section
                _buildHeroBanner(restaurant),

                // 2. Overlapping Restaurant Card
                _buildRestaurantHeaderCard(context, restaurant),

                const SizedBox(height: 16),

                // 3. Category Tabs (Horizontal Sticky Pill List)
                if (categories.isNotEmpty) _buildCategoryTabs(categories),

                const SizedBox(height: 16),

                // 4. Menu Items Section
                if (currentCategory != null)
                  _buildMenuSection(context, currentCategory)
                else if (categories.isEmpty)
                  _buildEmptyMenuPlaceholder(theme),
              ],
            ),
          ),

          // 5. Sticky Bottom Cart Bar (shows if items added) - NO OVERFLOW
          if (_cartCount > 0)
            Positioned(
              left: 12,
              right: 12,
              bottom: 12,
              child: _buildBottomCartBar(context),
            ),
        ],
      ),
    );
  }

  // Helper method for robust image loading (supports Network URLs and Assets)
  Widget _buildImageWidget(String path, {BoxFit fit = BoxFit.cover, double? width, double? height}) {
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return Image.network(
        path,
        width: width,
        height: height,
        fit: fit,
        loadingBuilder: (context, child, progress) {
          if (progress == null) return child;
          return Container(
            width: width,
            height: height,
            color: const Color(0xFFEAEDFF),
            child: const Center(
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: Color(0xFFDC2626),
              ),
            ),
          );
        },
        errorBuilder: (context, error, stackTrace) => Container(
          width: width,
          height: height,
          color: const Color(0xFFEAEDFF),
          child: const Icon(
            Icons.restaurant,
            size: 32,
            color: Color(0xFF5C403C),
          ),
        ),
      );
    } else {
      return Image.asset(
        path,
        width: width,
        height: height,
        fit: fit,
        errorBuilder: (context, error, stackTrace) => Image.asset(
          'assets/images/new logo.png',
          width: width,
          height: height,
          fit: fit,
          errorBuilder: (c, e, s) => Container(
            width: width,
            height: height,
            color: const Color(0xFFEAEDFF),
            child: const Icon(
              Icons.restaurant,
              size: 32,
              color: Color(0xFF5C403C),
            ),
          ),
        ),
      );
    }
  }

  // ----------------------------- 1. Hero Banner -----------------------------

  Widget _buildHeroBanner(Restaurant restaurant) {
    return SizedBox(
      height: 200,
      width: double.infinity,
      child: Stack(
        fit: StackFit.expand,
        children: [
          _buildImageWidget(restaurant.image, fit: BoxFit.cover),

          // Dark gradient overlay at bottom & top
          Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  Colors.black.withValues(alpha: 0.3),
                  Colors.transparent,
                  Colors.black.withValues(alpha: 0.6),
                ],
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                stops: const [0.0, 0.4, 1.0],
              ),
            ),
          ),

          // Top right Action buttons (Favorite & Share)
          Positioned(
            top: 12,
            right: 16,
            child: Row(
              children: [
                _buildIconButton(
                  icon: _isFavorite ? Icons.favorite : Icons.favorite_border,
                  iconColor: _isFavorite ? const Color(0xFFDC2626) : const Color(0xFF131B2E),
                  onTap: () {
                    setState(() {
                      _isFavorite = !_isFavorite;
                    });
                  },
                ),
                const SizedBox(width: 8),
                _buildIconButton(
                  icon: Icons.share,
                  iconColor: const Color(0xFF131B2E),
                  onTap: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Restaurant link copied!'),
                        duration: Duration(seconds: 1),
                        behavior: SnackBarBehavior.floating,
                      ),
                    );
                  },
                ),
              ],
            ),
          ),

          // Bottom left tags (Express Cloud Kitchen & Delivery Time)
          Positioned(
            bottom: 32,
            left: 16,
            child: Row(
              children: [
                if (restaurant.isExpressCloudKitchen)
                  Container(
                    margin: const EdgeInsets.only(right: 8),
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: const Color(0xFFDC2626),
                      borderRadius: BorderRadius.circular(20),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.15),
                          blurRadius: 4,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.bolt, color: Colors.white, size: 14),
                        SizedBox(width: 4),
                        Text(
                          'Express Cloud Kitchen',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                  ),

                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.95),
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.1),
                        blurRadius: 4,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.timer, color: Color(0xFFDC2626), size: 14),
                      const SizedBox(width: 4),
                      Text(
                        restaurant.deliveryTime,
                        style: const TextStyle(
                          color: Color(0xFF131B2E),
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildIconButton({
    required IconData icon,
    required Color iconColor,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 36,
        height: 36,
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.92),
          shape: BoxShape.circle,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.15),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Icon(icon, color: iconColor, size: 18),
      ),
    );
  }

  // ----------------------------- 2. Restaurant Header Card -----------------------------

  Widget _buildRestaurantHeaderCard(BuildContext context, Restaurant restaurant) {
    return Transform.translate(
      offset: const Offset(0, -18),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.08),
                blurRadius: 16,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Logo + Name + Category Tag
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(14),
                    child: Container(
                      width: 54,
                      height: 54,
                      decoration: BoxDecoration(
                        color: const Color(0xFFFEF2F2),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: const Color(0xFFFEE2E2)),
                      ),
                      child: _buildImageWidget(
                        restaurant.logoAsset,
                        fit: BoxFit.cover,
                        width: 54,
                        height: 54,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Wrap(
                          crossAxisAlignment: WrapCrossAlignment.center,
                          spacing: 6,
                          runSpacing: 4,
                          children: [
                            Text(
                              restaurant.name,
                              style: const TextStyle(
                                fontSize: 19,
                                fontWeight: FontWeight.w800,
                                color: Color(0xFF131B2E),
                                letterSpacing: -0.3,
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 7,
                                vertical: 2,
                              ),
                              decoration: BoxDecoration(
                                color: const Color(0xFFE2E7FF),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                restaurant.categoryTag,
                                style: const TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w700,
                                  color: Color(0xFF131B2E),
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          restaurant.tagline,
                          style: const TextStyle(
                            fontSize: 12,
                            color: Color(0xFF5C403C),
                            fontWeight: FontWeight.w400,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 14),

              // Badges Row (Rating, Delivery Fee, Express Distance)
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                physics: const BouncingScrollPhysics(),
                child: Row(
                  children: [
                    // Rating Pill
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFFDDB8),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.star, color: Color(0xFF7F4F00), size: 14),
                          const SizedBox(width: 3),
                          Text(
                            restaurant.rating.toString(),
                            style: const TextStyle(
                              fontSize: 12.5,
                              fontWeight: FontWeight.w800,
                              color: Color(0xFF2A1700),
                            ),
                          ),
                          // Omitted when the backend has a rating but no
                          // review count — the app does not invent one.
                          if (restaurant.reviewCount.isNotEmpty) ...[
                            const SizedBox(width: 2),
                            Text(
                              '(${restaurant.reviewCount})',
                              style: const TextStyle(
                                fontSize: 10.5,
                                color: Color(0xFF653E00),
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),

                    const SizedBox(width: 8),

                    // Delivery Fee Pill
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        color: const Color(0xFFDCE1FF),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(
                            Icons.two_wheeler,
                            color: Color(0xFF001551),
                            size: 14,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            restaurant.deliveryFeeInfo,
                            style: const TextStyle(
                              fontSize: 11.5,
                              fontWeight: FontWeight.w600,
                              color: Color(0xFF001551),
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(width: 8),

                    // Opening hours pill (real backend values, when set).
                    if (restaurant.expressTime.isNotEmpty)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                        decoration: BoxDecoration(
                          color: const Color(0xFFE2E7FF),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(
                              Icons.schedule,
                              color: Color(0xFFDC2626),
                              size: 14,
                            ),
                            const SizedBox(width: 4),
                            Text(
                              restaurant.expressTime,
                              style: const TextStyle(
                                fontSize: 11.5,
                                fontWeight: FontWeight.w600,
                                color: Color(0xFF131B2E),
                              ),
                            ),
                          ],
                        ),
                      ),
                  ],
                ),
              ),

              // Coupon / Offer Card.
              //
              // Speedy Meals' backend has no promotion engine at all, so rather
              // than advertising a discount code that checkout could not honour,
              // this card is only rendered when a real code exists.
              if (restaurant.promoCode.isNotEmpty) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: const Color(0xFFF2F3FF),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Row(
                  children: [
                    const Icon(
                      Icons.local_offer,
                      color: Color(0xFFDC2626),
                      size: 18,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: RichText(
                        text: TextSpan(
                          style: const TextStyle(
                            fontSize: 12,
                            color: Color(0xFF131B2E),
                            fontFamily: 'Plus Jakarta Sans',
                          ),
                          children: [
                            const TextSpan(text: 'Use code '),
                            TextSpan(
                              text: restaurant.promoCode,
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                color: Color(0xFFDC2626),
                              ),
                            ),
                            TextSpan(text: ' for ${restaurant.promoDiscount}'),
                          ],
                        ),
                      ),
                    ),
                    InkWell(
                      onTap: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text('Coupon ${restaurant.promoCode} applied!'),
                            duration: const Duration(seconds: 1),
                            behavior: SnackBarBehavior.floating,
                            shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12)),
                          ),
                        );
                      },
                      child: const Text(
                        'APPLY',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF1D4ED8),
                          letterSpacing: 0.5,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  // ----------------------------- 3. Category Tabs -----------------------------

  Widget _buildCategoryTabs(List<RestaurantMenuCategory> categories) {
    return SizedBox(
      height: 38,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: categories.length,
        itemBuilder: (context, index) {
          final isSelected = index == _selectedCategoryIndex;
          final category = categories[index];

          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: GestureDetector(
              onTap: () {
                setState(() {
                  _selectedCategoryIndex = index;
                });
              },
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                decoration: BoxDecoration(
                  color: isSelected ? const Color(0xFF283044) : const Color(0xFFEAEDFF),
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: isSelected
                      ? [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.1),
                            blurRadius: 4,
                            offset: const Offset(0, 2),
                          ),
                        ]
                      : null,
                ),
                child: Text(
                  category.name,
                  style: TextStyle(
                    fontSize: 12.5,
                    fontWeight: isSelected ? FontWeight.w700 : FontWeight.w600,
                    color: isSelected ? const Color(0xFFEEF0FF) : const Color(0xFF131B2E),
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  // ----------------------------- 4. Menu Section -----------------------------

  Widget _buildMenuSection(BuildContext context, RestaurantMenuCategory category) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Category Header & item count
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                category.name,
                style: const TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF131B2E),
                ),
              ),
              Text(
                '${category.items.length} Items',
                style: const TextStyle(
                  fontSize: 12,
                  color: Color(0xFF5C403C),
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),

          const SizedBox(height: 12),

          // Menu Item Cards
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: category.items.length,
            separatorBuilder: (context, index) => const SizedBox(height: 12),
            itemBuilder: (context, index) {
              final item = category.items[index];
              return _buildMenuItemCard(context, item);
            },
          ),
        ],
      ),
    );
  }

  Widget _buildMenuItemCard(BuildContext context, RestaurantMenuItem item) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Left: Info & Price
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Tag Badge if present
                if (item.tag != null) ...[
                  Row(
                    children: [
                      Container(
                        width: 14,
                        height: 14,
                        decoration: BoxDecoration(
                          color: _getTagBgColor(item.tagType),
                          borderRadius: BorderRadius.circular(3),
                        ),
                        child: Center(
                          child: Container(
                            width: 6,
                            height: 6,
                            decoration: const BoxDecoration(
                              color: Color(0xFFDC2626),
                              shape: BoxShape.circle,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 6),
                      Text(
                        item.tag!,
                        style: TextStyle(
                          fontSize: 10.5,
                          fontWeight: FontWeight.w800,
                          color: _getTagTextColor(item.tagType),
                          letterSpacing: 0.3,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                ],

                // Item Name
                Text(
                  item.name,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF131B2E),
                    height: 1.2,
                  ),
                ),

                const SizedBox(height: 4),

                // Description
                Text(
                  item.description,
                  style: const TextStyle(
                    fontSize: 12,
                    color: Color(0xFF5C403C),
                    height: 1.35,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),

                const SizedBox(height: 12),

                // Price & Add Button
                Row(
                  children: [
                    Text(
                      'Rs. ${item.price.toStringAsFixed(0)}',
                      style: const TextStyle(
                        fontSize: 16.5,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF131B2E),
                      ),
                    ),
                    const SizedBox(width: 12),
                    ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFDC2626),
                        foregroundColor: Colors.white,
                        elevation: 0,
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 6,
                        ),
                        minimumSize: const Size(0, 34),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(18),
                        ),
                      ),
                      onPressed: () => _addToCart(item),
                      icon: const Icon(Icons.add, size: 15),
                      label: const Text(
                        'Add',
                        style: TextStyle(
                          fontSize: 12.5,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          const SizedBox(width: 12),

          // Right: Food Image with rating overlay
          SizedBox(
            width: 90,
            height: 90,
            child: Stack(
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(14),
                  child: Container(
                    width: 90,
                    height: 90,
                    color: const Color(0xFFEAEDFF),
                    child: _buildImageWidget(
                      item.imageUrl,
                      width: 90,
                      height: 90,
                      fit: BoxFit.cover,
                    ),
                  ),
                ),
                // Rating Overlay Badge.
                // The backend rates restaurants, not individual dishes, so this
                // is only rendered when a real dish rating exists.
                if (item.rating > 0)
                  Positioned(
                    bottom: 4,
                    right: 4,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 6,
                        vertical: 2,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.92),
                        borderRadius: BorderRadius.circular(10),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.1),
                            blurRadius: 3,
                          ),
                        ],
                      ),
                      child: Text(
                        '${item.rating} ★',
                        style: const TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF131B2E),
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Color _getTagBgColor(String? type) {
    switch (type) {
      case 'must_try':
        return const Color(0xFFFFDAD6);
      case 'spicy':
        return const Color(0xFFFFDAD6);
      case 'signature':
        return const Color(0xFFFFE2B8);
      default:
        return const Color(0xFFE2E7FF);
    }
  }

  Color _getTagTextColor(String? type) {
    switch (type) {
      case 'must_try':
        return const Color(0xFFDC2626);
      case 'spicy':
        return const Color(0xFF1D4ED8);
      case 'signature':
        return const Color(0xFF7F4F00);
      default:
        return const Color(0xFF131B2E);
    }
  }

  Widget _buildEmptyMenuPlaceholder(ThemeData theme) {
    return Container(
      padding: const EdgeInsets.all(32),
      alignment: Alignment.center,
      child: Column(
        children: [
          const Icon(Icons.restaurant_menu, size: 48, color: Colors.grey),
          const SizedBox(height: 12),
          Text(
            'Menu items coming soon!',
            style: theme.textTheme.titleMedium?.copyWith(color: Colors.grey),
          ),
        ],
      ),
    );
  }

  // ----------------------------- 5. Bottom Sticky Cart Bar (NO OVERFLOW) -----------------------------

  Widget _buildBottomCartBar(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: const Color(0xFF283044),
        borderRadius: BorderRadius.circular(18),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.25),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          // Left Side: Cart Badge + Count + Total (Expanded to fill available space)
          Expanded(
            child: Row(
              children: [
                // Item Count Badge
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: const Color(0xFFDC2626),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Center(
                    child: Text(
                      '$_cartCount',
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 10),

                // Cart Price & Subtitle (Wrapped in Expanded with ellipsis)
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        formatPkr(_cartTotal),
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      Text(
                        '$_cartCount ${_cartCount == 1 ? 'Item' : 'Items'} • Speedy Delivery',
                        style: TextStyle(
                          fontSize: 10.5,
                          color: Colors.white.withValues(alpha: 0.75),
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(width: 8),

          // Right Side: View Basket Action Button
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFDC2626),
              foregroundColor: Colors.white,
              elevation: 0,
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              minimumSize: const Size(0, 42),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => const CartScreen(),
                ),
              );
            },
            child: const Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'View Basket',
                  style: TextStyle(
                    fontSize: 13.5,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                SizedBox(width: 4),
                Icon(Icons.arrow_forward_rounded, size: 16),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
