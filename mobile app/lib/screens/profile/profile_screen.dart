import 'package:flutter/material.dart';

import '../../core/constants/app_constants.dart';
import '../../data/models/user_models.dart';
import '../../data/repositories/user_repository.dart';
import '../../services/auth_service.dart';
import '../auth/register_as_screen.dart';
import '../notifications/notifications_screen.dart';
import '../orders/order_history_screen.dart';
import 'edit_profile_screen.dart';
import 'saved_addresses_screen.dart';

/// User profile / account hub.
///
/// Surfaced as the 4th tab of `HomeNavigation`. Reads the active session from
/// [AuthService] and degrades gracefully to a guest profile when no user is
/// signed in, so the tab can never render blank.
class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final UserRepository _userRepository = UserRepository();

  /// Guards against double-taps while the logout dialog/navigation runs.
  bool _isLoggingOut = false;

  /// The customer's real saved addresses (`GET /users/me/addresses`), used to
  /// show the current delivery location and to seed the address manager.
  List<UserAddress> _addresses = const [];
  bool _isLoadingAddresses = true;

  @override
  void initState() {
    super.initState();
    // Re-read the backend profile so any edit made elsewhere (or on another
    // device) is reflected, then load the saved addresses.
    AuthService.instance.refreshProfile().catchError((_) {});
    _loadAddresses();
  }

  Future<void> _loadAddresses() async {
    try {
      final addresses = await _userRepository.listAddresses();
      if (!mounted) return;
      setState(() {
        _addresses = addresses;
        _isLoadingAddresses = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _isLoadingAddresses = false);
    }
  }

  /// The address the backend would use for browsing: the flagged default, or
  /// the most recent one when nothing is flagged.
  UserAddress? get _defaultAddress {
    for (final address in _addresses) {
      if (address.isDefault) return address;
    }
    return _addresses.isEmpty ? null : _addresses.first;
  }

  Future<void> _openAddresses() async {
    await Navigator.of(context).push(
      MaterialPageRoute(builder: (context) => const SavedAddressesScreen()),
    );
    // Addresses may have been added/removed/defaulted while we were away.
    if (mounted) await _loadAddresses();
  }

  void _openOrders() {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (context) => const OrderHistoryScreen()),
    );
  }

  /// Opens the profile editor and re-reads the profile on return.
  Future<void> _openEditProfile() async {
    final user = AuthService.instance.currentUser;
    if (user == null) {
      _showComingSoon('Profile editing');
      return;
    }
    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => EditProfileScreen(
          initialName: user.name,
          initialEmail: user.email,
        ),
      ),
    );
    if (mounted) await AuthService.instance.refreshProfile();
  }

  /// Shows the confirmation dialog and, on confirm, clears the session and
  /// returns to the auth entry point.
  Future<void> _confirmLogout() async {
    if (_isLoggingOut) return;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
        ),
        title: const Text('Log out?'),
        content: const Text(
          'You will need to sign in again to place or track orders.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            style: FilledButton.styleFrom(
              backgroundColor: Theme.of(context).colorScheme.error,
            ),
            child: const Text('Log out'),
          ),
        ],
      ),
    );

    // `null` means the dialog was dismissed (tap outside / back button).
    if (confirmed != true || !mounted) return;

    setState(() => _isLoggingOut = true);

    AuthService.instance.logout();

    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (context) => const RegisterAsScreen()),
      (route) => false,
    );
  }

  void _showComingSoon(String feature) {
    ScaffoldMessenger.of(context)
      ..clearSnackBars()
      ..showSnackBar(
        SnackBar(
          content: Text('$feature is coming soon.'),
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    // Defensive: the session may be null (e.g. OTP/browse-as-guest flows).
    final user = AuthService.instance.currentUser;
    final isRider = user?.isRider ?? false;
    final name = _orFallback(user?.name, 'Guest User');
    final email = _orFallback(user?.email, 'Not signed in');
    final phone = _orFallback(user?.phoneNumber, 'No phone on file');
    final address = _isLoadingAddresses
        ? 'Loading delivery address…'
        : (_defaultAddress?.displaySubtitle ?? AppConstants.noAddressLabel);

    return Scaffold(
      backgroundColor: theme.colorScheme.surface,
      appBar: AppBar(
        backgroundColor: theme.colorScheme.surface,
        elevation: 0,
        automaticallyImplyLeading: false,
        title: const Text('Profile'),
      ),
      body: SafeArea(
        top: false,
        child: SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _ProfileHeaderCard(
                name: name,
                email: email,
                phone: phone,
                address: address,
                roleLabel: isRider ? 'Delivery Rider' : 'Customer',
                onEdit: () => _openEditProfile(),
              ),
              const SizedBox(height: 24),
              const _SectionHeader('My Account'),
              const SizedBox(height: 8),
              _OptionsCard(
                children: [
                  _ProfileMenuTile(
                    icon: Icons.receipt_long_rounded,
                    iconColor: const Color(0xFFDC2626),
                    title: 'My Orders',
                    subtitle: 'Track and review your order history',
                    onTap: _openOrders,
                  ),
                  const _MenuDivider(),
                  _ProfileMenuTile(
                    icon: Icons.location_on_rounded,
                    iconColor: const Color(0xFF1D4ED8),
                    title: 'Saved Addresses',
                    subtitle: _addresses.isEmpty
                        ? 'Add a delivery location'
                        : '${_addresses.length} saved location${_addresses.length == 1 ? '' : 's'}' ,
                    onTap: _openAddresses,
                  ),
                  const _MenuDivider(),
                  _ProfileMenuTile(
                    icon: Icons.credit_card_rounded,
                    iconColor: const Color(0xFFF59E0B),
                    title: 'Payment Methods',
                    // There is no stored-payment backend: payment is chosen per
                    // order (Cash on Delivery or the Digital demo), so there is
                    // nothing to manage here yet.
                    subtitle: 'Chosen at checkout (Cash on Delivery / Online)',
                    onTap: () => _showComingSoon('Stored payment methods'),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              const _SectionHeader('Preferences'),
              const SizedBox(height: 8),
              _OptionsCard(
                children: [
                  _ProfileMenuTile(
                    icon: Icons.settings_rounded,
                    iconColor: const Color(0xFF10B981),
                    title: 'App Settings & Notifications',
                    subtitle: 'Alerts, promos and app preferences',
                    onTap: () => Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (context) => const NotificationsScreen(),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 28),
              SizedBox(
                height: 52,
                child: OutlinedButton.icon(
                  onPressed: _isLoggingOut ? null : _confirmLogout,
                  icon: const Icon(Icons.logout_rounded, size: 18),
                  label: const Text('Logout'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: theme.colorScheme.error,
                    side: BorderSide(
                      color: theme.colorScheme.error.withValues(alpha: 0.5),
                      width: 1.5,
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                    textStyle: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 32),
              const _DiscovertechFooter(),
            ],
          ),
        ),
      ),
    );
  }

  /// Returns a trimmed [value], or [fallback] when it is null/blank.
  static String _orFallback(String? value, String fallback) {
    final trimmed = value?.trim() ?? '';
    return trimmed.isEmpty ? fallback : trimmed;
  }
}

// ----------------------------- Header -----------------------------

class _ProfileHeaderCard extends StatelessWidget {
  final String name;
  final String email;
  final String phone;
  final String address;
  final String roleLabel;

  /// Opens the profile editor (`PUT /users/me`).
  final VoidCallback onEdit;

  const _ProfileHeaderCard({
    required this.name,
    required this.email,
    required this.phone,
    required this.address,
    required this.roleLabel,
    required this.onEdit,
  });

  /// First letter of the display name, used inside the avatar placeholder.
  String get _initial {
    final trimmed = name.trim();
    return trimmed.isEmpty ? '?' : trimmed[0].toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      margin: EdgeInsets.zero,
      color: theme.colorScheme.surfaceContainerLowest,
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          children: [
            Row(
              children: [
                // Avatar placeholder — falls back to the user's initial.
                Container(
                  width: 72,
                  height: 72,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: theme.colorScheme.primaryContainer,
                    border: Border.all(
                      color: theme.colorScheme.primary.withValues(alpha: 0.18),
                      width: 2,
                    ),
                  ),
                  alignment: Alignment.center,
                  child: Text(
                    _initial,
                    style: theme.textTheme.headlineLarge?.copyWith(
                      fontWeight: FontWeight.w800,
                      color: theme.colorScheme.primary,
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        name,
                        style: theme.textTheme.headlineSmall?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 9,
                          vertical: 3,
                        ),
                        decoration: BoxDecoration(
                          color: theme.colorScheme.primaryContainer
                              .withValues(alpha: 0.16),
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: Text(
                          roleLabel,
                          style: theme.textTheme.labelSmall?.copyWith(
                            color: theme.colorScheme.primary,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  tooltip: 'Edit profile',
                  onPressed: onEdit,
                  icon: const Icon(Icons.edit_outlined, size: 20),
                ),
              ],
            ),
            const SizedBox(height: 18),
            _InfoRow(icon: Icons.mail_outline_rounded, value: email),
            const SizedBox(height: 10),
            _InfoRow(icon: Icons.phone_outlined, value: phone),
            const SizedBox(height: 10),
            _InfoRow(icon: Icons.location_on_outlined, value: address),
          ],
        ),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String value;

  const _InfoRow({required this.icon, required this.value});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 18, color: theme.colorScheme.onSurfaceVariant),
        const SizedBox(width: 10),
        Expanded(
          child: Text(
            value,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurface,
              height: 1.35,
            ),
          ),
        ),
      ],
    );
  }
}

// ----------------------------- Options -----------------------------

class _SectionHeader extends StatelessWidget {
  final String label;

  const _SectionHeader(this.label);

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.only(left: 4),
      child: Text(
        label,
        style: theme.textTheme.labelMedium?.copyWith(
          color: theme.colorScheme.onSurfaceVariant,
          fontWeight: FontWeight.bold,
          letterSpacing: 0.6,
        ),
      ),
    );
  }
}

class _OptionsCard extends StatelessWidget {
  final List<Widget> children;

  const _OptionsCard({required this.children});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      margin: EdgeInsets.zero,
      color: theme.colorScheme.surfaceContainerLowest,
      clipBehavior: Clip.antiAlias,
      child: Column(children: children),
    );
  }
}

class _MenuDivider extends StatelessWidget {
  const _MenuDivider();

  @override
  Widget build(BuildContext context) {
    return Divider(
      height: 1,
      thickness: 1,
      indent: 62,
      color: Theme.of(context).colorScheme.surfaceContainerHigh,
    );
  }
}

class _ProfileMenuTile extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  const _ProfileMenuTile({
    required this.icon,
    required this.iconColor,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: iconColor.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, size: 20, color: iconColor),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            Icon(
              Icons.chevron_right_rounded,
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ],
        ),
      ),
    );
  }
}

// ----------------------------- Footer -----------------------------

/// Subtle product attribution pinned to the bottom of the profile tab.
class _DiscovertechFooter extends StatelessWidget {
  const _DiscovertechFooter();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Center(
      child: Text(
        'Powered by Discovertech',
        textAlign: TextAlign.center,
        style: theme.textTheme.labelSmall?.copyWith(
          color: theme.colorScheme.onSurfaceVariant.withValues(alpha: 0.65),
          fontWeight: FontWeight.w600,
          letterSpacing: 0.6,
        ),
      ),
    );
  }
}
