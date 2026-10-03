import 'package:flutter/material.dart';
import '../screens/auth/register_as_screen.dart';
import '../screens/cart/cart_screen.dart';
import '../screens/dashboard/dashboard_screen.dart';
import '../screens/profile/profile_screen.dart';
import '../screens/tracking/track_orders_tab.dart';
import '../services/auth_service.dart';
import '../services/cart_service.dart';

/// Bottom navigation bar for the main app.
class HomeNavigation extends StatefulWidget {
  const HomeNavigation({super.key});

  @override
  State<HomeNavigation> createState() => _HomeNavigationState();
}

class _HomeNavigationState extends State<HomeNavigation> {
  int _currentIndex = 0;

  /// One-shot flag so the auth guard cannot push the login screen twice for a
  /// single sign-out.
  bool _redirectingToAuth = false;

  @override
  void initState() {
    super.initState();
    AuthService.instance.addListener(_onAuthChanged);
  }

  @override
  void dispose() {
    AuthService.instance.removeListener(_onAuthChanged);
    super.dispose();
  }

  /// Authentication guard.
  ///
  /// If the session ends while this shell is on screen — an explicit logout, or
  /// a dead refresh token surfaced by [ApiClient.onSessionExpired] after a 401 —
  /// the user is returned to the auth entry point instead of being left on a
  /// dashboard whose every request will 401.
  void _onAuthChanged() {
    if (!mounted || _redirectingToAuth) return;
    final auth = AuthService.instance;
    if (auth.isBootstrapping || auth.isLoggedIn) return;

    _redirectingToAuth = true;
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (context) => const RegisterAsScreen()),
      (route) => false,
    );
  }

  // Screens are built once and kept alive by the IndexedStack below.
  // Each is defensive by design so a slow/failed child can never blank the tab.
  final List<Widget> _screens = const [
    DashboardScreen(),
    CartScreen(),
    // Resolves the customer's real orders from the backend: live tracking while
    // an order is in flight, otherwise their order history.
    TrackOrdersTab(),
    ProfileScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: _screens,
      ),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: theme.colorScheme.surfaceContainerLowest,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha:0.1),
              blurRadius: 10,
              offset: const Offset(0, -2),
            ),
          ],
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _NavItem(
                  icon: Icons.home_outlined,
                  activeIcon: Icons.home,
                  label: 'Home',
                  isSelected: _currentIndex == 0,
                  onTap: () {
                    setState(() {
                      _currentIndex = 0;
                    });
                  },
                ),
                AnimatedBuilder(
                  animation: CartService.instance,
                  builder: (context, _) => _NavItem(
                    icon: Icons.shopping_bag_outlined,
                    activeIcon: Icons.shopping_bag,
                    label: 'Cart',
                    badgeCount: CartService.instance.itemCount,
                    isSelected: _currentIndex == 1,
                    onTap: () {
                      setState(() {
                        _currentIndex = 1;
                      });
                    },
                  ),
                ),
                _NavItem(
                  icon: Icons.south_america_outlined,
                  activeIcon: Icons.south_america,
                  label: 'Track',
                  isSelected: _currentIndex == 2,
                  onTap: () {
                    setState(() {
                      _currentIndex = 2;
                    });
                  },
                ),
                _NavItem(
                  icon: Icons.person_outline,
                  activeIcon: Icons.person,
                  label: 'Profile',
                  isSelected: _currentIndex == 3,
                  onTap: () {
                    setState(() {
                      _currentIndex = 3;
                    });
                  },
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _NavItem extends StatelessWidget {
  final IconData icon;
  final IconData activeIcon;
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  /// When greater than zero a small count badge is rendered over the icon.
  final int badgeCount;

  const _NavItem({
    required this.icon,
    required this.activeIcon,
    required this.label,
    required this.isSelected,
    required this.onTap,
    this.badgeCount = 0,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return GestureDetector(
      onTap: onTap,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Stack(
            clipBehavior: Clip.none,
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: isSelected
                      ? const Color(0xFFDC2626)
                      : Colors.transparent,
                ),
                child: Icon(
                  isSelected ? activeIcon : icon,
                  color: isSelected
                      ? Colors.white
                      : theme.colorScheme.onSurfaceVariant,
                  size: 24,
                ),
              ),
              if (badgeCount > 0)
                Positioned(
                  top: 0,
                  right: 0,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 5,
                      vertical: 1,
                    ),
                    constraints: const BoxConstraints(minWidth: 16),
                    decoration: BoxDecoration(
                      color: const Color(0xFF1D4ED8),
                      borderRadius: BorderRadius.circular(999),
                      border: Border.all(color: Colors.white, width: 1.5),
                    ),
                    child: Text(
                      badgeCount > 99 ? '99+' : '$badgeCount',
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
          const SizedBox(height: 2),
          Text(
            label,
            style: theme.textTheme.labelSmall?.copyWith(
              color: isSelected
                  ? const Color(0xFFDC2626)
                  : theme.colorScheme.onSurfaceVariant,
              fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
            ),
          ),
        ],
      ),
    );
  }
}
