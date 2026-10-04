import 'package:flutter/material.dart';

import '../../data/models/rider_models.dart';
import 'rider_navigation_service.dart';

/// Navigation section widget embedded in the rider assignment view.
///
/// Features:
/// - Context-aware destination selection (defaults to Restaurant before pickup, Customer after pickup).
/// - Manual destination selector allowing riders to toggle between Restaurant and Customer.
/// - Clear action buttons ("Navigate to Restaurant", "Navigate to Customer") when valid coordinates exist.
/// - Graceful "Destination location is unavailable." message when coordinates are missing or invalid.
/// - Automatically hidden for completed, cancelled, or unaccepted orders.
class RiderNavigationSection extends StatefulWidget {
  final RiderAssignment assignment;
  final RiderNavigationService navigationService;
  final void Function(String message)? onError;

  const RiderNavigationSection({
    super.key,
    required this.assignment,
    this.navigationService = const RiderNavigationService(),
    this.onError,
  });

  @override
  State<RiderNavigationSection> createState() => _RiderNavigationSectionState();
}

class _RiderNavigationSectionState extends State<RiderNavigationSection> {
  late NavigationDestinationType _selectedDestination;
  bool _isLaunching = false;

  @override
  void initState() {
    super.initState();
    _selectedDestination = RiderNavigationService.defaultDestinationForStatus(
      widget.assignment.status,
    );
  }

  @override
  void didUpdateWidget(covariant RiderNavigationSection oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.assignment.status != widget.assignment.status) {
      _selectedDestination = RiderNavigationService.defaultDestinationForStatus(
        widget.assignment.status,
      );
    }
  }

  Future<void> _handleNavigate(double latitude, double longitude) async {
    if (_isLaunching) return;

    setState(() {
      _isLaunching = true;
    });

    try {
      final result = await widget.navigationService.launchNavigation(
        latitude: latitude,
        longitude: longitude,
      );

      if (!mounted) return;

      if (!result.success && result.errorMessage != null) {
        widget.onError?.call(result.errorMessage!);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(result.errorMessage!),
            backgroundColor: const Color(0xFFDC2626),
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLaunching = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!RiderNavigationService.isNavigationEligible(widget.assignment)) {
      return const SizedBox.shrink();
    }

    final coords = RiderNavigationService.getDestinationCoordinates(
      widget.assignment,
      _selectedDestination,
    );

    final isRestaurant = _selectedDestination == NavigationDestinationType.restaurant;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Destination Selector
        Container(
          height: 38,
          decoration: BoxDecoration(
            color: const Color(0xFF0F172A),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: const Color(0xFF334155)),
          ),
          child: Row(
            children: [
              Expanded(
                child: _DestinationTab(
                  label: 'Restaurant',
                  icon: Icons.storefront_rounded,
                  isSelected: isRestaurant,
                  onTap: () {
                    if (!isRestaurant) {
                      setState(() {
                        _selectedDestination = NavigationDestinationType.restaurant;
                      });
                    }
                  },
                ),
              ),
              Expanded(
                child: _DestinationTab(
                  label: 'Customer',
                  icon: Icons.person_pin_circle_rounded,
                  isSelected: !isRestaurant,
                  onTap: () {
                    if (isRestaurant) {
                      setState(() {
                        _selectedDestination = NavigationDestinationType.customer;
                      });
                    }
                  },
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 8),

        // Action Button or Unavailable Fallback
        if (coords != null)
          ElevatedButton.icon(
            key: Key(isRestaurant ? 'navigate_to_restaurant_button' : 'navigate_to_customer_button'),
            onPressed: _isLaunching ? null : () => _handleNavigate(coords.latitude, coords.longitude),
            icon: _isLaunching
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                  )
                : const Icon(Icons.navigation_rounded, size: 16),
            label: Text(
              isRestaurant ? 'Navigate to Restaurant' : 'Navigate to Customer',
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
            ),
            style: ElevatedButton.styleFrom(
              backgroundColor: isRestaurant ? const Color(0xFF2563EB) : const Color(0xFF059669),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 10),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
          )
        else
          Container(
            key: const Key('navigation_unavailable_message'),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
            decoration: BoxDecoration(
              color: const Color(0xFF1E293B),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: const Color(0xFF475569)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(
                  Icons.location_off_rounded,
                  color: Color(0xFF94A3B8),
                  size: 16,
                ),
                const SizedBox(width: 8),
                const Text(
                  'Destination location is unavailable.',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFFCBD5E1),
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }
}

class _DestinationTab extends StatelessWidget {
  final String label;
  final IconData icon;
  final bool isSelected;
  final VoidCallback onTap;

  const _DestinationTab({
    required this.label,
    required this.icon,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF334155) : Colors.transparent,
          borderRadius: BorderRadius.circular(8),
        ),
        padding: const EdgeInsets.symmetric(vertical: 6),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              size: 14,
              color: isSelected ? Colors.white : const Color(0xFF94A3B8),
            ),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                color: isSelected ? Colors.white : const Color(0xFF94A3B8),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
