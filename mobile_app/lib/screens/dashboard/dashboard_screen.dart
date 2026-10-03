import 'dart:async';

import 'package:flutter/material.dart';

import '../../core/network/api_exception.dart';
import '../../data/json_utils.dart';
import '../../data/models/catalog_models.dart';
import '../../data/repositories/restaurant_repository.dart';
import '../../models/restaurant.dart';
import '../../services/cart_service.dart';
import '../../services/notification_service.dart';
import '../cart/cart_screen.dart';
import '../menu/restaurant_detail_screen.dart';
import '../notifications/notifications_screen.dart';
import '../profile/saved_addresses_screen.dart';

/// Speedy Meals home dashboard screen.
///
/// Matches the Stitch home mockup: solid red header, compact location/ETA pill in Royal Blue,
/// search bar, auto-swapping promo hero carousel, category carousel with food images, live order snippet,
/// cloud kitchen restaurant cards with bright yellow rating badges, popular items grid, and sticky cart bar.
class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  final TextEditingController _searchController = TextEditingController();

  /// Pending debounce timer for the search field.
  Timer? _debounce;

  /// The active (debounced) search query. Empty means "browsing".
  String _query = '';

  static const Duration _debounceDuration = Duration(milliseconds: 300);

  final RestaurantRepository _restaurantRepository = RestaurantRepository();

  /// Real restaurants from `GET /restaurants`, scoped to the customer's saved
  /// address. Empty until the first response arrives.
  List<Restaurant> _restaurants = const [];
  bool _isLoadingRestaurants = true;
  ApiException? _restaurantsError;

  /// How many restaurants have their menu pre-fetched. Browse returns summaries
  /// only, so the "popular dishes" rail and search-by-dish need real menu data;
  /// capping the count keeps the dashboard to a small, bounded number of
  /// requests instead of one per restaurant.
  static const int _menuPreviewCount = 4;

  /// Menu for one restaurant, or empty when it is unavailable (a single failed
  /// menu fetch must never blank the whole dashboard).
  Future<List<MenuCategory>> _menuFor(RestaurantSummary summary) async {
    try {
      return await _restaurantRepository.menu(summary.id);
    } on ApiException {
      return const [];
    }
  }

  @override
  void initState() {
    super.initState();
    _loadRestaurants();
    // Keeps the bell badge in step with the customer's real order updates.
    NotificationService.instance.refresh();
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _searchController.dispose();
    super.dispose();
  }

  /// Loads the restaurants the backend says can deliver to this customer.
  ///
  /// The endpoint derives location from the customer's own saved address (its
  /// default, or `?address_id=`) and returns 400 when none exists - a
  /// delivery app has nothing to show without an address, so that case gets its
  /// own message rather than a generic error.
  Future<void> _loadRestaurants() async {
    setState(() {
      _isLoadingRestaurants = true;
      _restaurantsError = null;
    });

    try {
      final summaries = await _restaurantRepository.browse();
      if (!mounted) return;

      // Browse returns summaries only; fetch the first few menus so the
      // popular-dishes rail and search-by-dish are backed by real dishes.
      final menus = await Future.wait([
        for (var i = 0; i < summaries.length; i++)
          i < _menuPreviewCount ? _menuFor(summaries[i]) : Future.value(const <MenuCategory>[]),
      ]);
      if (!mounted) return;

      setState(() {
        _restaurants = [
          for (var i = 0; i < summaries.length; i++)
            Restaurant.fromBackend(summaries[i], menu: menus[i]),
        ];
        _isLoadingRestaurants = false;
      });
    } on ApiException catch (error) {
      if (!mounted) return;
      setState(() {
        _restaurantsError = error;
        _isLoadingRestaurants = false;
      });
    }
  }

  /// Debounces keystrokes so filtering only runs after the user pauses typing.
  void _onSearchChanged(String value) {
    _debounce?.cancel();
    _debounce = Timer(_debounceDuration, () {
      if (!mounted) return;
      final trimmed = value.trim();
      if (trimmed == _query) return;
      setState(() => _query = trimmed);
    });
  }

  /// Clears the search field and returns to the browse experience.
  void _clearSearch() {
    _debounce?.cancel();
    _searchController.clear();
    if (_query.isEmpty) return;
    setState(() => _query = '');
  }

  /// Applies a category chip tap as a search query.
  void _applyQuery(String value) {
    _debounce?.cancel();
    _searchController.text = value;
    _searchController.selection =
        TextSelection.fromPosition(TextPosition(offset: value.length));
    setState(() => _query = value);
  }

  void _openNotifications() {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => const NotificationsScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final bottomInset = MediaQuery.of(context).padding.bottom;
    final isSearching = _query.isNotEmpty;

    return Scaffold(
      extendBodyBehindAppBar: false,
      backgroundColor: theme.colorScheme.surface,
      appBar: AppBar(
        backgroundColor: const Color(0xFFDC2626),
        elevation: 2,
        shadowColor: Colors.black.withValues(alpha: 0.2),
        automaticallyImplyLeading: false,
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(2),
              decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle),
              child: ClipOval(
                child: Image.asset(
                  'assets/images/logo.png',
                  height: 28,
                  width: 28,
                  fit: BoxFit.cover,
                  errorBuilder: (context, error, stackTrace) =>
                      const Icon(Icons.fastfood, size: 20, color: Color(0xFFDC2626)),
                ),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                'Speedy Meals',
                style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold, color: Colors.white),
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
        actions: [
          // Reactive bell: badge only appears while unread notifications exist.
          AnimatedBuilder(
            animation: NotificationService.instance,
            builder: (context, _) {
              final unread = NotificationService.instance.unreadCount;
              return IconButton(
                tooltip: 'Notifications',
                icon: Stack(
                  clipBehavior: Clip.none,
                  children: [
                    const Icon(Icons.notifications_none, color: Colors.white),
                    if (unread > 0)
                      Positioned(
                        right: -6,
                        top: -6,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                          constraints: const BoxConstraints(minWidth: 16),
                          decoration: BoxDecoration(
                            color: const Color(0xFF1D4ED8),
                            borderRadius: BorderRadius.circular(999),
                            border: Border.all(color: Colors.white, width: 1.5),
                          ),
                          child: Text(
                            unread > 99 ? '99+' : '$unread',
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 9,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
                onPressed: _openNotifications,
              );
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _loadRestaurants,
        color: const Color(0xFFDC2626),
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
          slivers: [
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Search & Active Location Sub-header
                    _LocationSearchPill(),
                    const SizedBox(height: 12),

                    // Quick Search Bar
                    _SearchBar(
                      controller: _searchController,
                      onChanged: _onSearchChanged,
                      onClear: _clearSearch,
                    ),
                  ],
                ),
              ),
            ),

            if (isSearching)
              SliverToBoxAdapter(
                child: _SearchResultsView(
                  query: _query,
                  onClear: _clearSearch,
                  onCategorySelected: _applyQuery,
                  restaurants: _restaurants,
                ),
              )
            else ...[
              SliverToBoxAdapter(
                child: _PromoHeroBanner(restaurants: _restaurants),
              ),

              SliverToBoxAdapter(child: _CategorySection(theme: theme)),

              SliverToBoxAdapter(child: _LiveOrderSnippet(restaurants: _restaurants)),

              SliverToBoxAdapter(
                child: _CloudKitchenSection(
                  restaurants: _restaurants,
                  isLoading: _isLoadingRestaurants,
                  error: _restaurantsError,
                  onRetry: _loadRestaurants,
                ),
              ),

              SliverToBoxAdapter(
                child: _PopularItemsSection(restaurants: _restaurants),
              ),

              const SliverToBoxAdapter(child: SizedBox(height: 24)),

              // Sticky cart bar
              SliverPersistentHeader(pinned: true, delegate: _StickyCartBarDelegate(bottomPadding: bottomInset)),
            ],
          ],
        ),
      ),
    );
  }
}

// ----------------------------- Sub-components -----------------------------

class _LocationSearchPill extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Row(
      children: [
        Expanded(
          flex: 5,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
            decoration: BoxDecoration(
              color: theme.colorScheme.surfaceContainerLow,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(color: const Color(0xFF1D4ED8), borderRadius: BorderRadius.circular(8)),
                  child: const Icon(Icons.location_on, color: Colors.white, size: 18),
                ),
                const SizedBox(width: 6),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Deliver to',
                        style: theme.textTheme.labelMedium?.copyWith(
                          color: theme.colorScheme.onSurfaceVariant,
                          letterSpacing: 0.5,
                        ),
                      ),
                      const SizedBox(height: 1),
                      GestureDetector(
                        onTap: () {},
                        child: Row(
                          children: [
                            Expanded(
                              child: Text(
                                'Home • Street 5, Block B, Clifton',
                                style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            Icon(Icons.keyboard_arrow_down, color: theme.colorScheme.secondary, size: 20),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(width: 4),
        Flexible(
          flex: 2,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
            decoration: BoxDecoration(color: const Color(0xFF1D4ED8), borderRadius: BorderRadius.circular(12)),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 7,
                  height: 7,
                  decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle),
                ),
                const SizedBox(width: 4),
                Flexible(
                  child: Text(
                    '18m ETA',
                    style: theme.textTheme.labelMedium?.copyWith(color: Colors.white, fontWeight: FontWeight.bold),
                    overflow: TextOverflow.ellipsis,
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

class _SearchBar extends StatelessWidget {
  final TextEditingController controller;
  final ValueChanged<String> onChanged;
  final VoidCallback onClear;

  const _SearchBar({
    required this.controller,
    required this.onChanged,
    required this.onClear,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerLowest,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 8, offset: const Offset(0, 2))],
      ),
      child: Row(
        children: [
          const Padding(
            padding: EdgeInsets.only(left: 14),
            child: Icon(Icons.search, color: Color(0xFF5C403C), size: 20),
          ),
          Expanded(
            // Rebuilds just this field so the clear button appears/disappears.
            child: ValueListenableBuilder<TextEditingValue>(
              valueListenable: controller,
              builder: (context, value, _) {
                return TextField(
                  controller: controller,
                  onChanged: onChanged,
                  textInputAction: TextInputAction.search,
                  textCapitalization: TextCapitalization.none,
                  decoration: InputDecoration(
                    hintText: 'Search burgers, biryani, pizza...',
                    hintStyle: theme.textTheme.bodyMedium?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant.withValues(alpha: 0.7),
                    ),
                    border: InputBorder.none,
                    enabledBorder: InputBorder.none,
                    focusedBorder: InputBorder.none,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
                    suffixIcon: value.text.isEmpty
                        ? null
                        : IconButton(
                            tooltip: 'Clear search',
                            icon: const Icon(Icons.close, size: 18),
                            color: theme.colorScheme.onSurfaceVariant,
                            onPressed: onClear,
                          ),
                  ),
                );
              },
            ),
          ),
          Padding(
            padding: const EdgeInsets.only(right: 8),
            child: GestureDetector(
              onTap: () {
                ScaffoldMessenger.of(context)
                  ..clearSnackBars()
                  ..showSnackBar(
                    const SnackBar(
                      content: Text('Sort & filter options are coming soon.'),
                      behavior: SnackBarBehavior.floating,
                      duration: Duration(seconds: 2),
                    ),
                  );
              },
              child: Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(color: const Color(0xFFDC2626), borderRadius: BorderRadius.circular(10)),
                child: const Icon(Icons.tune, color: Colors.white, size: 18),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ----------------------------- Search results -----------------------------

/// Live search results for the dashboard query.
///
/// Filters restaurants (name, cuisine, area and their menu items), popular
/// dishes and categories, then renders grouped results or an empty state.
class _SearchResultsView extends StatelessWidget {
  final String query;
  final VoidCallback onClear;
  final ValueChanged<String> onCategorySelected;

  /// Real restaurants from the backend, used as the search corpus.
  final List<Restaurant> restaurants;

  const _SearchResultsView({
    required this.query,
    required this.onClear,
    required this.onCategorySelected,
    required this.restaurants,
  });

  static const List<String> _suggestedQueries = [
    'Pizza',
    'Burgers',
    'Biryani',
    'Shawarma',
    'Desserts',
  ];

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final q = query.toLowerCase();

    final matchedRestaurants = restaurants.where((restaurant) {
      return restaurant.name.toLowerCase().contains(q) ||
          restaurant.tagline.toLowerCase().contains(q) ||
          restaurant.categoryTag.toLowerCase().contains(q) ||
          restaurant.location.toLowerCase().contains(q) ||
          restaurant.categories.any(
            (category) =>
                category.name.toLowerCase().contains(q) ||
                category.items.any(
                  (item) =>
                      item.name.toLowerCase().contains(q) ||
                      item.description.toLowerCase().contains(q),
                ),
          );
    }).toList();

    // Real dishes matching the query, drawn from the fetched menus.
    final dishes = <_PopularItem>[
      for (final restaurant in restaurants)
        for (final category in restaurant.categories)
          for (final item in category.items)
            if (item.name.toLowerCase().contains(q) ||
                item.description.toLowerCase().contains(q))
              _PopularItem(restaurant: restaurant, item: item),
    ];

    final categories = _categories
        .where((category) => category.label.toLowerCase().contains(q))
        .toList();

    final hasResults = matchedRestaurants.isNotEmpty ||
        dishes.isNotEmpty ||
        categories.isNotEmpty;

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  hasResults
                      ? 'Results for "$query"'
                      : 'No results for "$query"',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              TextButton(
                onPressed: onClear,
                child: const Text('Clear'),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            hasResults
                ? '${matchedRestaurants.length} restaurants, ${dishes.length} dishes, ${categories.length} categories'
                : 'Try a different keyword or pick one below.',
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 16),

          if (!hasResults) ...[
            _buildEmptyState(context, theme),
          ] else ...[
            if (categories.isNotEmpty) ...[
              Text(
                'Categories',
                style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: categories
                    .map(
                      (category) => ActionChip(
                        label: Text(category.label),
                        onPressed: () => onCategorySelected(category.label),
                      ),
                    )
                    .toList(),
              ),
              const SizedBox(height: 20),
            ],

            if (matchedRestaurants.isNotEmpty) ...[
              Text(
                'Restaurants & Kitchens',
                style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              ...matchedRestaurants.map(
                (restaurant) => Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: _SearchRestaurantTile(restaurant: restaurant),
                ),
              ),
              const SizedBox(height: 10),
            ],

            if (dishes.isNotEmpty) ...[
              Text(
                'Dishes',
                style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 12),
              GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  childAspectRatio: 0.68,
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                ),
                itemCount: dishes.length,
                itemBuilder: (context, index) => _PopularItemCard(item: dishes[index]),
              ),
            ],
          ],
        ],
      ),
    );
  }

  Widget _buildEmptyState(BuildContext context, ThemeData theme) {
    return Column(
      children: [
        const SizedBox(height: 8),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(vertical: 28, horizontal: 16),
          decoration: BoxDecoration(
            color: theme.colorScheme.surfaceContainerLow,
            borderRadius: BorderRadius.circular(20),
          ),
          child: Column(
            children: [
              Icon(
                Icons.search_off,
                size: 56,
                color: theme.colorScheme.onSurfaceVariant.withValues(alpha: 0.6),
              ),
              const SizedBox(height: 12),
              Text(
                'Nothing matched "$query"',
                style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 4),
              Text(
                'Check the spelling or explore one of these popular craves.',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                alignment: WrapAlignment.center,
                children: _suggestedQueries
                    .map(
                      (suggestion) => ActionChip(
                        avatar: const Icon(Icons.local_fire_department, size: 16),
                        label: Text(suggestion),
                        onPressed: () => onCategorySelected(suggestion),
                      ),
                    )
                    .toList(),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

/// Compact horizontal restaurant row used by the search results list.
class _SearchRestaurantTile extends StatelessWidget {
  final Restaurant restaurant;

  const _SearchRestaurantTile({required this.restaurant});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Material(
      color: theme.colorScheme.surfaceContainerLowest,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => RestaurantDetailScreen(restaurant: restaurant),
            ),
          );
        },
        child: Padding(
          padding: const EdgeInsets.all(10),
          child: Row(
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: SizedBox(
                  width: 68,
                  height: 68,
                  child: restaurant.hasHeroImage
                      ? Image.network(
                          restaurant.heroAsset,
                          fit: BoxFit.cover,
                          loadingBuilder: (context, child, progress) {
                            if (progress == null) return child;
                            return Container(
                              color: theme.colorScheme.surfaceContainerHigh,
                              child: const Center(
                                child: CircularProgressIndicator(strokeWidth: 2),
                              ),
                            );
                          },
                          errorBuilder: (context, error, stackTrace) => Container(
                            color: theme.colorScheme.surfaceContainerHigh,
                            child: const Icon(Icons.restaurant, size: 26),
                          ),
                        )
                      : Container(
                          color: theme.colorScheme.surfaceContainerHigh,
                          child: const Icon(Icons.restaurant, size: 26),
                        ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      restaurant.name,
                      style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      restaurant.tagline,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        const Icon(Icons.star, color: Color(0xFFF59E0B), size: 13),
                        const SizedBox(width: 3),
                        Text(
                          restaurant.rating.toString(),
                          style: theme.textTheme.labelSmall?.copyWith(fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(width: 10),
                        Icon(Icons.bolt, color: theme.colorScheme.primary, size: 13),
                        const SizedBox(width: 2),
                        Flexible(
                          child: Text(
                            restaurant.deliveryTime,
                            style: theme.textTheme.labelSmall,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              Icon(Icons.chevron_right, color: theme.colorScheme.onSurfaceVariant),
            ],
          ),
        ),
      ),
    );
  }
}

// ----------------------------- Auto-Swapping Hero Promo Carousel -----------------------------

class _PromoItem {
  final String title;
  final String tag;
  final String code;
  final String subtitle;
  final String buttonText;
  final IconData buttonIcon;

  const _PromoItem({
    required this.title,
    required this.tag,
    required this.code,
    required this.subtitle,
    required this.buttonText,
    this.buttonIcon = Icons.bolt,
  });
}

final List<_PromoItem> _promoCards = const [
  _PromoItem(
    title: 'Get 30% OFF\nFirst Order!',
    tag: 'Ends in 2h 14m',
    code: 'SPEEDY30',
    subtitle: 'Use code at checkout • Min spend Rs. 999',
    buttonText: 'Claim & Order',
    buttonIcon: Icons.bolt,
  ),
  _PromoItem(
    title: 'Free Delivery on\nCloud Kitchens!',
    tag: 'Exclusive Deal',
    code: 'FREESHIP',
    subtitle: 'No minimum order required • Limited time offer',
    buttonText: 'Explore Kitchens',
    buttonIcon: Icons.storefront,
  ),
  _PromoItem(
    title: 'Flat Rs. 250 Cashback\nMidnight Cravings!',
    tag: 'Late Night Special',
    code: 'NIGHT250',
    subtitle: 'Valid on orders placed between 10 PM - 3 AM',
    buttonText: 'Order Late Night',
    buttonIcon: Icons.nightlife,
  ),
];

class _PromoHeroBanner extends StatefulWidget {
  /// Real restaurants, so each promo card's call-to-action opens a storefront
  /// that actually exists rather than a hardcoded sample.
  final List<Restaurant> restaurants;

  const _PromoHeroBanner({required this.restaurants});

  @override
  State<_PromoHeroBanner> createState() => _PromoHeroBannerState();
}

class _PromoHeroBannerState extends State<_PromoHeroBanner> {
  late final PageController _pageController;
  Timer? _carouselTimer;
  int _currentPage = 0;

  @override
  void initState() {
    super.initState();
    _pageController = PageController(initialPage: 0);
    _startAutoSwipe();
  }

  void _startAutoSwipe() {
    _carouselTimer?.cancel();
    _carouselTimer = Timer.periodic(const Duration(seconds: 3), (timer) {
      if (_pageController.hasClients) {
        _currentPage = (_currentPage + 1) % _promoCards.length;
        _pageController.animateToPage(
          _currentPage,
          duration: const Duration(milliseconds: 400),
          curve: Curves.easeInOut,
        );
      }
    });
  }

  @override
  void dispose() {
    _carouselTimer?.cancel();
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return SizedBox(
      height: 195,
      child: PageView.builder(
        controller: _pageController,
        onPageChanged: (index) {
          setState(() {
            _currentPage = index;
          });
        },
        itemCount: _promoCards.length,
        itemBuilder: (context, index) {
          final promo = _promoCards[index];
          return _buildPromoCard(context, theme, promo);
        },
      ),
    );
  }

  Widget _buildPromoCard(BuildContext context, ThemeData theme, _PromoItem promo) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [const Color(0xFFDC2626), theme.colorScheme.primaryContainer, theme.colorScheme.primaryContainer],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(24),
      ),
      child: Stack(
        children: [
          // Soft glow
          Positioned(
            right: -40,
            bottom: -40,
            child: Container(
              width: 120,
              height: 120,
              decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.12), shape: BoxShape.circle),
            ),
          ),
          Positioned(
            right: 0,
            top: 0,
            child: Column(
              children: List.generate(
                4,
                (index) => Container(
                  width: 60 - index * 12,
                  height: 3,
                  color: Colors.white.withValues(alpha: 0.25),
                  margin: const EdgeInsets.only(left: 20, top: 6),
                  transform: Matrix4.skewX(-0.2),
                ),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Flexible(
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.timer, color: Colors.white, size: 14),
                            const SizedBox(width: 4),
                            Flexible(
                              child: Text(
                                promo.tag,
                                style: theme.textTheme.labelSmall?.copyWith(
                                  color: Colors.white,
                                  fontWeight: FontWeight.bold,
                                ),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: theme.colorScheme.surfaceContainerLowest.withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        promo.code,
                        style: theme.textTheme.labelSmall?.copyWith(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 1,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  promo.title,
                  style: theme.textTheme.headlineMedium?.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    height: 1.1,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  promo.subtitle,
                  style: theme.textTheme.bodySmall?.copyWith(color: Colors.white.withValues(alpha: 0.85)),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: Container(
                        height: 38,
                        decoration: BoxDecoration(
                          color: theme.colorScheme.surfaceContainerLowest,
                          borderRadius: BorderRadius.circular(12),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.1),
                              blurRadius: 6,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        child: Material(
                          color: Colors.transparent,
                          child: InkWell(
                            borderRadius: BorderRadius.circular(12),
                            onTap: () {
                              // NOTE: the promo *copy* is presentational - the
                              // backend has no promotions/promo-code system
                              // (spec Sec 14 excludes loyalty/referral). The
                              // button therefore only browses real restaurants.
                              final restaurants = widget.restaurants;
                              if (restaurants.isEmpty) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                    content: Text('No restaurants available right now.'),
                                  ),
                                );
                                return;
                              }
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (context) => RestaurantDetailScreen(restaurant: restaurants.first),
                                ),
                              );
                            },
                            child: Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 12),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Flexible(
                                    child: Text(
                                      promo.buttonText,
                                      style: theme.textTheme.labelLarge?.copyWith(
                                        color: const Color(0xFFDC2626),
                                        fontWeight: FontWeight.bold,
                                      ),
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                  const SizedBox(width: 6),
                                  Icon(promo.buttonIcon, color: const Color(0xFFDC2626), size: 16),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    // Animated Dots indicator
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: List.generate(
                        _promoCards.length,
                        (dotIndex) => AnimatedContainer(
                          duration: const Duration(milliseconds: 300),
                          margin: const EdgeInsets.symmetric(horizontal: 2.5),
                          width: dotIndex == _currentPage ? 16 : 6,
                          height: 6,
                          decoration: BoxDecoration(
                            color: dotIndex == _currentPage ? Colors.white : Colors.white.withValues(alpha: 0.4),
                            borderRadius: BorderRadius.circular(4),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _CategorySection extends StatelessWidget {
  final ThemeData theme;

  const _CategorySection({required this.theme});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  'Craving Categories',
                  style: theme.textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.bold),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              TextButton(
                onPressed: () {},
                child: Text(
                  'Explore All',
                  style: theme.textTheme.labelMedium?.copyWith(
                    color: theme.colorScheme.primary,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        SizedBox(
          height: 100,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: _categories.length,
            itemBuilder: (context, index) {
              final item = _categories[index];
              return Padding(
                padding: const EdgeInsets.only(right: 12),
                child: Column(
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(20),
                      child: Container(
                        width: 64,
                        height: 64,
                        decoration: BoxDecoration(
                          color: theme.colorScheme.surfaceContainerHigh,
                          borderRadius: BorderRadius.circular(20),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.06),
                              blurRadius: 6,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        child: Image.network(
                          item.imageUrl,
                          width: 64,
                          height: 64,
                          fit: BoxFit.cover,
                          loadingBuilder: (context, child, progress) {
                            if (progress == null) return child;
                            return Container(
                              color: theme.colorScheme.surfaceContainerHigh,
                              child: const Center(child: CircularProgressIndicator(strokeWidth: 2)),
                            );
                          },
                          errorBuilder: (context, error, stackTrace) => Container(
                            color: theme.colorScheme.primaryContainer,
                            child: const Icon(Icons.fastfood, color: Colors.white, size: 28),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      item.label,
                      style: theme.textTheme.labelMedium?.copyWith(fontWeight: FontWeight.bold),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}

/// Live-activity snippet. Shows a real count of kitchens delivering to the
/// customer's address rather than fabricated social proof.
class _LiveOrderSnippet extends StatelessWidget {
  final List<Restaurant> restaurants;

  const _LiveOrderSnippet({required this.restaurants});

  /// Shortest real ETA across the loaded restaurants (parsed from the
  /// backend-derived label), or a neutral "Live" when none is available.
  String get _fastestEta {
    int? best;
    for (final restaurant in restaurants) {
      final match = RegExp(r'(\d+)\s*min').firstMatch(restaurant.deliveryTime);
      final minutes = match == null ? null : int.tryParse(match.group(1)!);
      if (minutes == null) continue;
      if (best == null || minutes < best) best = minutes;
    }
    return best == null ? 'Live' : '~$best min';
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerLow,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 6, offset: const Offset(0, 2))],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: const Color(0xFFDC2626), borderRadius: BorderRadius.circular(12)),
            child: const Icon(Icons.local_fire_department, color: Colors.white, size: 24),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Live Orders',
                  style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold),
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    const Icon(Icons.person, size: 14, color: Color(0xFF5C403C)),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        '${restaurants.length} ${restaurants.length == 1 ? 'kitchen' : 'kitchens'} delivering now',
                        style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(color: const Color(0xFFDC2626), borderRadius: BorderRadius.circular(20)),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.timer, color: Colors.white, size: 14),
                const SizedBox(width: 4),
                Text(
                  _fastestEta,
                  style: theme.textTheme.labelSmall?.copyWith(color: Colors.white, fontWeight: FontWeight.bold),
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _CloudKitchenSection extends StatelessWidget {
  /// Real restaurants from `GET /restaurants`.
  final List<Restaurant> restaurants;
  final bool isLoading;
  final ApiException? error;
  final VoidCallback onRetry;

  const _CloudKitchenSection({
    required this.restaurants,
    required this.isLoading,
    required this.error,
    required this.onRetry,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: [
                Icon(Icons.storefront, color: theme.colorScheme.primary, size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Top Cloud Kitchens & Eateries',
                    style: theme.textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.bold),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 4),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Text(
              'Ultra-fast delivery from dedicated culinary labs',
              style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          const SizedBox(height: 12),
          _buildBody(context, theme),
        ],
      ),
    );
  }

  Widget _buildBody(BuildContext context, ThemeData theme) {
    if (isLoading) {
      return const SizedBox(
        height: 236,
        child: Center(child: CircularProgressIndicator()),
      );
    }

    final failure = error;
    if (failure != null) {
      // No blank screen on failure: explain, and offer a retry.
      final isNoAddress = failure.kind == ApiErrorKind.badRequest;
      return Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: theme.colorScheme.surfaceContainerLow,
            borderRadius: BorderRadius.circular(20),
          ),
          child: Column(
            children: [
              Icon(
                isNoAddress ? Icons.location_off_rounded : Icons.wifi_off_rounded,
                size: 40,
                color: theme.colorScheme.onSurfaceVariant,
              ),
              const SizedBox(height: 12),
              Text(
                isNoAddress
                    ? 'Add a delivery address to see restaurants'
                    : 'Could not load restaurants',
                style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 6),
              Text(
                failure.message,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 14),
              if (isNoAddress)
                // Browsing is impossible without a saved address, so send the
                // customer straight to the address manager instead of leaving
                // them with a dead end, then reload on return.
                FilledButton.icon(
                  onPressed: () async {
                    await Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (context) => const SavedAddressesScreen(),
                      ),
                    );
                    onRetry();
                  },
                  icon: const Icon(Icons.add_location_alt_outlined, size: 18),
                  label: const Text('Add delivery address'),
                )
              else
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

    if (restaurants.isEmpty) {
      return Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: theme.colorScheme.surfaceContainerLow,
            borderRadius: BorderRadius.circular(20),
          ),
          child: Column(
            children: [
              Icon(
                Icons.storefront_outlined,
                size: 40,
                color: theme.colorScheme.onSurfaceVariant,
              ),
              const SizedBox(height: 12),
              Text(
                'No restaurants deliver to this address yet',
                style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 6),
              Text(
                'Try a different saved address or check back soon.',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      );
    }

    return SizedBox(
      height: 236,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: restaurants.length,
        itemBuilder: (context, index) {
          final restaurant = restaurants[index];
          return Padding(
            padding: const EdgeInsets.only(right: 16),
            child: SizedBox(width: 280, child: _RestaurantCard(restaurant: restaurant)),
          );
        },
      ),
    );
  }
}

class _PopularItemsSection extends StatelessWidget {
  /// Real restaurants (with their menus pre-fetched) used to build the rail.
  final List<Restaurant> restaurants;

  const _PopularItemsSection({required this.restaurants});

  /// A handful of real dishes to feature - the first available item of the
  /// first few restaurants. Nothing here is invented: name, price and image all
  /// come from the restaurant's own menu.
  List<_PopularItem> get _featured {
    final featured = <_PopularItem>[];
    for (final restaurant in restaurants) {
      for (final category in restaurant.categories) {
        for (final item in category.items) {
          if (!item.isAvailable) continue;
          featured.add(_PopularItem(restaurant: restaurant, item: item));
          break;
        }
      }
      if (featured.length >= 4) break;
    }
    return featured;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final featured = _featured;

    // Nothing real to show yet - render nothing rather than a mock rail.
    if (featured.isEmpty) return const SizedBox.shrink();

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Popular Craves Right Now',
                      style: theme.textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.bold),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Fresh dishes from kitchens delivering to you',
                      style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(color: const Color(0xFFDC2626), borderRadius: BorderRadius.circular(20)),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.local_fire_department, color: Colors.white, size: 14),
                    const SizedBox(width: 4),
                    Text(
                      'Trending',
                      style: theme.textTheme.labelSmall?.copyWith(color: Colors.white, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              childAspectRatio: 0.68,
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
            ),
            itemCount: featured.length,
            itemBuilder: (context, index) {
              return _PopularItemCard(item: featured[index]);
            },
          ),
        ],
      ),
    );
  }
}

// ----------------------------- Data models -----------------------------

class _Category {
  final String imageUrl;
  final String label;

  const _Category({required this.imageUrl, required this.label});
}

/// One real dish on the "popular" rail, paired with the restaurant it belongs
/// to so tapping it (or adding it) targets the correct restaurant's cart.
class _PopularItem {
  final Restaurant restaurant;
  final RestaurantMenuItem item;

  const _PopularItem({required this.restaurant, required this.item});

  String get name => item.name;
  String get description => item.description;
  double get price => item.price;
  String get imageAsset => item.imageUrl;
  bool get isAvailable => item.isAvailable;
}

// ----------------------------- Static data -----------------------------

final List<_Category> _categories = const [
  _Category(
    label: 'Pizza',
    imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=200&auto=format&fit=crop&q=80',
  ),
  _Category(
    label: 'Burgers',
    imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=200&auto=format&fit=crop&q=80',
  ),
  _Category(
    label: 'Cloud Hub',
    imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200&auto=format&fit=crop&q=80',
  ),
  _Category(
    label: 'Fast Food',
    imageUrl: 'https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=200&auto=format&fit=crop&q=80',
  ),
  _Category(
    label: 'Shawarma',
    imageUrl: 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=200&auto=format&fit=crop&q=80',
  ),
  _Category(
    label: 'Desserts',
    imageUrl: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=200&auto=format&fit=crop&q=80',
  ),
  _Category(
    label: 'Drinks',
    imageUrl: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=200&auto=format&fit=crop&q=80',
  ),
];

// Removed: the former hardcoded `_popularItems` list (fake dishes, fake ratings,
// fake review counts, external image URLs). The "popular" rail is now built
// from each restaurant's real menu - see `_PopularItemsSection._featured`.

// ----------------------------- Card widgets -----------------------------

class _RestaurantCard extends StatelessWidget {
  final Restaurant restaurant;

  const _RestaurantCard({required this.restaurant});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (context) => RestaurantDetailScreen(restaurant: restaurant)),
          );
        },
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
              height: 124,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  restaurant.hasHeroImage
                      ? Image.network(
                          restaurant.heroAsset,
                          fit: BoxFit.cover,
                          loadingBuilder: (context, child, progress) {
                            if (progress == null) return child;
                            return Container(
                              color: theme.colorScheme.surfaceContainerHigh,
                              child: const Center(child: CircularProgressIndicator(strokeWidth: 2)),
                            );
                          },
                          errorBuilder: (context, error, stackTrace) {
                            return Container(
                              color: theme.colorScheme.surfaceContainerHigh,
                              child: const Icon(Icons.restaurant, size: 40),
                            );
                          },
                        )
                      : Container(
                          color: theme.colorScheme.surfaceContainerHigh,
                          child: const Icon(Icons.restaurant, size: 40),
                        ),
                  // gradient overlay
                  Positioned(
                    left: 0,
                    right: 0,
                    bottom: 0,
                    child: Container(
                      height: 60,
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: [Colors.transparent, Colors.black.withValues(alpha: 0.5)],
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                        ),
                      ),
                    ),
                  ),
                  // Cloud Exclusive badge
                  if (restaurant.badges.contains('Cloud Exclusive'))
                    Positioned(
                      top: 10,
                      left: 10,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: theme.colorScheme.secondary,
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.cloud_sync, color: Colors.white, size: 13),
                            const SizedBox(width: 4),
                            Text(
                              'Cloud Exclusive',
                              style: theme.textTheme.labelSmall?.copyWith(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  // Free delivery pill
                  if (restaurant.freeDelivery)
                    Positioned(
                      top: 10,
                      right: 10,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: theme.colorScheme.primary,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          'FREE DELIVERY',
                          style: theme.textTheme.labelSmall?.copyWith(color: Colors.white, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ),
                  // Delivery time badge
                  Positioned(
                    bottom: 10,
                    left: 10,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: theme.colorScheme.surfaceContainerLowest.withValues(alpha: 0.9),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.bolt, color: theme.colorScheme.primary, size: 14),
                          const SizedBox(width: 4),
                          Text(
                            restaurant.deliveryTime,
                            style: theme.textTheme.labelSmall?.copyWith(fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          restaurant.name,
                          style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(width: 6),
                      _RatingBadge(rating: restaurant.rating),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    restaurant.tagline,
                    style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${restaurant.distance} • ${restaurant.location}',
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: theme.colorScheme.secondary,
                      fontWeight: FontWeight.bold,
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
    );
  }
}

class _RatingBadge extends StatelessWidget {
  final double rating;

  const _RatingBadge({required this.rating});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(color: const Color(0xFFF59E0B), borderRadius: BorderRadius.circular(6)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.star, color: Colors.white, size: 13),
          const SizedBox(width: 2),
          Text(
            rating.toString(),
            style: theme.textTheme.labelSmall?.copyWith(color: Colors.white, fontWeight: FontWeight.bold),
          ),
        ],
      ),
    );
  }
}

class _PopularItemCard extends StatefulWidget {
  final _PopularItem item;

  const _PopularItemCard({required this.item});

  @override
  State<_PopularItemCard> createState() => _PopularItemCardState();
}

class _PopularItemCardState extends State<_PopularItemCard> {
  bool _isAdding = false;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final item = widget.item;

    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => RestaurantDetailScreen(restaurant: item.restaurant),
          ),
        );
      },
      child: Container(
        decoration: BoxDecoration(
          color: theme.colorScheme.surfaceContainerLowest,
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 6, offset: const Offset(0, 2)),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Stack(
                    children: [
                      ClipRRect(
                        borderRadius: const BorderRadius.only(
                          topLeft: Radius.circular(20),
                          topRight: Radius.circular(20),
                        ),
                        child: AspectRatio(
                          aspectRatio: 16 / 9,
                          child: item.imageAsset.isEmpty
                              ? Container(
                                  color: theme.colorScheme.surfaceContainerHigh,
                                  child: const Icon(Icons.image, size: 32),
                                )
                              : Image.network(
                                  item.imageAsset,
                                  fit: BoxFit.cover,
                                  loadingBuilder: (context, child, progress) {
                                    if (progress == null) return child;
                                    return Container(
                                      color: theme.colorScheme.surfaceContainerHigh,
                                      child: const Center(child: CircularProgressIndicator(strokeWidth: 2)),
                                    );
                                  },
                                  errorBuilder: (context, error, stackTrace) {
                                    return Container(
                                      color: theme.colorScheme.surfaceContainerHigh,
                                      child: const Icon(Icons.image, size: 32),
                                    );
                                  },
                                ),
                        ),
                      ),
                      // Real availability from the backend, instead of an
                      // inert favourite toggle that persisted nothing.
                      if (!item.isAvailable)
                        Positioned(
                          top: 8,
                          right: 8,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: theme.colorScheme.error,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Text(
                              'Sold out',
                              style: TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold),
                            ),
                          ),
                        ),
                    ],
                  ),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Icon(
                              Icons.storefront,
                              size: 12,
                              color: theme.colorScheme.primary,
                            ),
                            const SizedBox(width: 3),
                            Expanded(
                              child: Text(
                                item.restaurant.name,
                                style: theme.textTheme.bodySmall?.copyWith(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w600,
                                  color: theme.colorScheme.onSurfaceVariant,
                                ),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 2),
                        Text(
                          item.name,
                          style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 1),
                        Text(
                          item.description,
                          style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            // Footer
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Price',
                          style: theme.textTheme.labelSmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                        ),
                        const SizedBox(height: 1),
                        Text(
                          formatPkr(item.price),
                          style: theme.textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                            color: theme.colorScheme.onSurface,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 4),
                  GestureDetector(
                    onTap: () => _handleAdd(),
                    child: Container(
                      width: 34,
                      height: 34,
                      decoration: BoxDecoration(
                        color: _isAdding ? theme.colorScheme.secondary : const Color(0xFFDC2626),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Icon(_isAdding ? Icons.check : Icons.add, color: Colors.white, size: 18),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _handleAdd() async {
    final item = widget.item;
    if (_isAdding || !item.isAvailable) return;

    setState(() => _isAdding = true);
    try {
      await CartService.instance.addItem(
        restaurantId: item.restaurant.id,
        item: item.item.toBackendMenuItem(),
        restaurantName: item.restaurant.name,
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context)
        ..clearSnackBars()
        ..showSnackBar(
          SnackBar(
            content: Text('${item.name} added to cart'),
            behavior: SnackBarBehavior.floating,
            duration: const Duration(seconds: 2),
          ),
        );
    } finally {
      if (mounted) setState(() => _isAdding = false);
    }
  }
}

// ----------------------------- Sticky cart bar -----------------------------

class _StickyCartBarDelegate extends SliverPersistentHeaderDelegate {
  final double bottomPadding;

  _StickyCartBarDelegate({this.bottomPadding = 0.0});

  @override
  double get minExtent => 68 + bottomPadding;

  @override
  double get maxExtent => 68 + bottomPadding;

  @override
  Widget build(BuildContext context, double shrinkOffset, bool overlapsContent) {
    final theme = Theme.of(context);

    // Rebuilds whenever the shared cart changes so the bar always reflects
    // the real item count and subtotal instead of hard-coded mock values.
    return AnimatedBuilder(
      animation: CartService.instance,
      builder: (context, _) {
        final cart = CartService.instance;
        final itemCount = cart.itemCount;

        return Container(
          decoration: BoxDecoration(
            color: theme.colorScheme.onSurface,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
            boxShadow: [
              BoxShadow(color: Colors.black.withValues(alpha: 0.15), blurRadius: 12, offset: const Offset(0, -4)),
            ],
          ),
          child: SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Row(
                children: [
                  // Bag icon with badge
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(color: const Color(0xFFDC2626), borderRadius: BorderRadius.circular(12)),
                    child: Stack(
                      clipBehavior: Clip.none,
                      children: [
                        const Icon(Icons.shopping_bag, color: Colors.white, size: 20),
                        if (itemCount > 0)
                          Positioned(
                            top: -7,
                            right: -7,
                            child: Container(
                              constraints: const BoxConstraints(minWidth: 16),
                              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                              decoration: const BoxDecoration(color: Color(0xFF1D4ED8), shape: BoxShape.circle),
                              child: Center(
                                child: Text(
                                  itemCount > 99 ? '99+' : '$itemCount',
                                  style: theme.textTheme.labelSmall?.copyWith(
                                    color: Colors.white,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 9,
                                  ),
                                ),
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  // Info
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          itemCount == 0
                              ? 'Your cart is empty'
                              : '$itemCount ${itemCount == 1 ? 'Item' : 'Items'} Selected',
                          style: theme.textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                            color: theme.colorScheme.surfaceContainerLowest,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        Text(
                          itemCount == 0
                              ? 'Add something tasty to get started'
                              : 'Subtotal Rs. ${cart.subtotal.toStringAsFixed(0)}',
                          style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.surfaceDim),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  // View cart button
                  GestureDetector(
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (context) => const CartScreen()),
                      );
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      decoration: BoxDecoration(
                        color: const Color(0xFFDC2626),
                        borderRadius: BorderRadius.circular(12),
                        boxShadow: [
                          BoxShadow(color: Colors.black.withValues(alpha: 0.1), blurRadius: 6, offset: const Offset(0, 2)),
                        ],
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            'View Cart',
                            style: theme.textTheme.labelLarge?.copyWith(fontWeight: FontWeight.bold, color: Colors.white),
                          ),
                          const SizedBox(width: 4),
                          const Icon(Icons.arrow_forward, color: Colors.white, size: 18),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  @override
  bool shouldRebuild(covariant _StickyCartBarDelegate oldDelegate) => oldDelegate.bottomPadding != bottomPadding;
}
