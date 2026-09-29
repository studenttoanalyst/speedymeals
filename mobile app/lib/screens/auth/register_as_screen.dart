import 'dart:ui';
import 'package:flutter/material.dart';

import 'customer_login_screen.dart';
import 'customer_signup_screen.dart';
import 'rider_login_screen.dart';
import 'rider_signup_screen.dart';

/// Enum representing the user's chosen registration type/role.
enum RegistrationType {
  customer,
  rider,
}

/// "Register As" selection screen for Speedy Meals.
///
/// Pixel-accurate, compact & responsive implementation matching the Stitch design.
class RegisterAsScreen extends StatefulWidget {
  const RegisterAsScreen({super.key});

  @override
  State<RegisterAsScreen> createState() => _RegisterAsScreenState();
}

class _RegisterAsScreenState extends State<RegisterAsScreen> {
  // Stored selected registration type (null initially so Continue button starts disabled)
  RegistrationType? _selectedRole;

  void _selectRole(RegistrationType role) {
    setState(() {
      _selectedRole = role;
    });
  }

  void _onContinue() {
    if (_selectedRole == null) return;

    if (_selectedRole == RegistrationType.customer) {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => const CustomerSignUpScreen(),
        ),
      );
    } else if (_selectedRole == RegistrationType.rider) {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => const RiderSignUpScreen(),
        ),
      );
    }
  }

  void _onSignIn() {
    if (_selectedRole == RegistrationType.rider) {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => const RiderLoginScreen(),
        ),
      );
    } else {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => const CustomerLoginScreen(),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isEnabled = _selectedRole != null;

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: SafeArea(
        child: Stack(
          children: [
            // Ambient top glow
            Positioned(
              top: -60,
              left: MediaQuery.of(context).size.width / 2 - 120,
              child: Container(
                width: 240,
                height: 240,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: const Color(0xFFDC2626).withValues(alpha: 0.08),
                ),
                child: BackdropFilter(
                  filter: ImageFilter.blur(sigmaX: 50, sigmaY: 50),
                  child: Container(color: Colors.transparent),
                ),
              ),
            ),

            Column(
              children: [
                // Top Navigation Bar
                Padding(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      InkWell(
                        onTap: () {
                          if (Navigator.canPop(context)) {
                            Navigator.pop(context);
                          }
                        },
                        borderRadius: BorderRadius.circular(20),
                        child: Container(
                          width: 36,
                          height: 36,
                          decoration: const BoxDecoration(
                            color: Color(0xFFF1F5F9),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(
                            Icons.chevron_left_rounded,
                            color: Color(0xFF334155),
                            size: 22,
                          ),
                        ),
                      ),
                      const Text(
                        'STEP 1 OF 2',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF94A3B8),
                          letterSpacing: 1.2,
                        ),
                      ),
                      const SizedBox(width: 36),
                    ],
                  ),
                ),

                // Main Content - Scrollable
                Expanded(
                  child: SingleChildScrollView(
                    physics: const BouncingScrollPhysics(),
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        const SizedBox(height: 4),

                        // Logo Header
                        _buildBrandHeader(),

                        const SizedBox(height: 12),

                        // Title & Subtitle
                        Text(
                          'Register As',
                          style: theme.textTheme.displayLarge?.copyWith(
                            fontSize: 24,
                            fontWeight: FontWeight.w800,
                            color: const Color(0xFF0F172A),
                            letterSpacing: -0.5,
                          ),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Choose how you want to use Speedy Meals',
                          style: theme.textTheme.bodyLarge?.copyWith(
                            fontSize: 13,
                            fontWeight: FontWeight.w500,
                            color: const Color(0xFF64748B),
                          ),
                          textAlign: TextAlign.center,
                        ),

                        const SizedBox(height: 16),

                        // Option 1: Customer Card (Compact)
                        _buildRoleCard(
                          type: RegistrationType.customer,
                          title: 'Customer',
                          badgeText: 'Popular',
                          badgeBgColor: const Color(0xFFFEE2E2),
                          badgeTextColor: const Color(0xFFDC2626),
                          description:
                              'Order food and get it delivered to your doorstep',
                          icon: Icons.soup_kitchen_rounded,
                          featurePills: [
                            const _FeaturePill(
                              dotColor: Color(0xFF10B981),
                              text: '15–25m delivery',
                            ),
                            const _FeaturePill(
                              text: 'Exclusive deals',
                            ),
                          ],
                        ),

                        const SizedBox(height: 12),

                        // Option 2: Delivery Rider Card (Compact)
                        _buildRoleCard(
                          type: RegistrationType.rider,
                          title: 'Delivery Rider',
                          badgeText: 'Earn Daily',
                          badgeBgColor: const Color(0xFFEFF6FF),
                          badgeTextColor: const Color(0xFF1D4ED8),
                          description:
                              'Deliver orders and earn with Speedy Meals',
                          icon: Icons.delivery_dining_rounded,
                          featurePills: [
                            const _FeaturePill(
                              dotColor: Color(0xFFF59E0B),
                              text: 'Flexible hours',
                            ),
                            const _FeaturePill(
                              text: 'Instant payouts',
                            ),
                          ],
                        ),

                        const SizedBox(height: 14),

                        // Trust info notice
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: const [
                            Icon(
                              Icons.verified_user_outlined,
                              size: 13,
                              color: Color(0xFF94A3B8),
                            ),
                            SizedBox(width: 5),
                            Flexible(
                              child: Text(
                                'You can switch accounts anytime from profile settings',
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w500,
                                  color: Color(0xFF94A3B8),
                                ),
                              ),
                            ),
                          ],
                        ),

                        const SizedBox(height: 16),
                      ],
                    ),
                  ),
                ),

                // Bottom Action Container
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 20, vertical: 14),
                  decoration: const BoxDecoration(
                    color: Colors.white,
                    border: Border(
                      top: BorderSide(color: Color(0xFFF1F5F9), width: 1),
                    ),
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // Continue Button
                      SizedBox(
                        width: double.infinity,
                        height: 48,
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 200),
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(14),
                            boxShadow: isEnabled
                                ? [
                                    BoxShadow(
                                      color: const Color(0xFFDC2626)
                                          .withValues(alpha: 0.3),
                                      blurRadius: 16,
                                      offset: const Offset(0, 6),
                                    ),
                                  ]
                                : [],
                          ),
                          child: ElevatedButton(
                            onPressed: isEnabled ? _onContinue : null,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFFDC2626),
                              disabledBackgroundColor: const Color(0xFFCBD5E1),
                              disabledForegroundColor: const Color(0xFF94A3B8),
                              elevation: 0,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(14),
                              ),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text(
                                  'Continue',
                                  style: TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w700,
                                    color: isEnabled
                                        ? Colors.white
                                        : const Color(0xFF94A3B8),
                                  ),
                                ),
                                const SizedBox(width: 6),
                                Icon(
                                  Icons.arrow_forward_rounded,
                                  size: 18,
                                  color: isEnabled
                                      ? Colors.white
                                      : const Color(0xFF94A3B8),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),

                      const SizedBox(height: 12),

                      // Sign In Footer Link
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Text(
                            'Already have an account? ',
                            style: TextStyle(
                              fontSize: 12.5,
                              fontWeight: FontWeight.w600,
                              color: Color(0xFF64748B),
                            ),
                          ),
                          GestureDetector(
                            onTap: _onSignIn,
                            child: const Text(
                              'Sign In',
                              style: TextStyle(
                                fontSize: 12.5,
                                fontWeight: FontWeight.w700,
                                color: Color(0xFFDC2626),
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
          ],
        ),
      ),
    );
  }

  Widget _buildBrandHeader() {
    return Column(
      children: [
        Stack(
          clipBehavior: Clip.none,
          children: [
            Container(
              width: 64,
              height: 64,
              padding: const EdgeInsets.all(9),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFF1F5F9), width: 1.5),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.05),
                    blurRadius: 12,
                    offset: const Offset(0, 3),
                  ),
                ],
              ),
              child: Image.asset(
                'assets/images/new logo.png',
                fit: BoxFit.contain,
                errorBuilder: (context, error, stackTrace) =>
                    Image.asset('assets/images/logo.png', fit: BoxFit.contain),
              ),
            ),
            Positioned(
              right: -3,
              bottom: -3,
              child: Container(
                padding: const EdgeInsets.all(4),
                decoration: const BoxDecoration(
                  color: Color(0xFFDC2626),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.flash_on_rounded,
                  color: Colors.white,
                  size: 11,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 6),
        const Text(
          'SPEEDY MEALS',
          style: TextStyle(
            fontSize: 9.5,
            fontWeight: FontWeight.w800,
            color: Color(0xFFDC2626),
            letterSpacing: 1.8,
          ),
        ),
      ],
    );
  }

  Widget _buildRoleCard({
    required RegistrationType type,
    required String title,
    required String badgeText,
    required Color badgeBgColor,
    required Color badgeTextColor,
    required String description,
    required IconData icon,
    required List<Widget> featurePills,
  }) {
    final isSelected = _selectedRole == type;

    return GestureDetector(
      onTap: () => _selectRole(type),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color:
                isSelected ? const Color(0xFFDC2626) : const Color(0xFFE2E8F0),
            width: isSelected ? 2 : 1.5,
          ),
          boxShadow: [
            if (isSelected)
              BoxShadow(
                color: const Color(0xFFDC2626).withValues(alpha: 0.12),
                blurRadius: 14,
                offset: const Offset(0, 4),
              )
            else
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.02),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
          ],
        ),
        child: Stack(
          children: [
            // Selection Radio Pill Top-Right
            Positioned(
              top: 0,
              right: 0,
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                width: 20,
                height: 20,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: isSelected
                      ? const Color(0xFFDC2626)
                      : Colors.transparent,
                  border: isSelected
                      ? null
                      : Border.all(color: const Color(0xFFCBD5E1), width: 1.5),
                ),
                child: isSelected
                    ? const Icon(
                        Icons.check_rounded,
                        color: Colors.white,
                        size: 13,
                      )
                    : null,
              ),
            ),

            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Role Icon Box (Compact)
                AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: isSelected
                        ? const Color(0xFFFEF2F2)
                        : const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(
                    icon,
                    size: 22,
                    color: isSelected
                        ? const Color(0xFFDC2626)
                        : const Color(0xFF475569),
                  ),
                ),

                const SizedBox(width: 12),

                // Content Column
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.only(right: 22),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Text(
                              title,
                              style: const TextStyle(
                                fontSize: 15.5,
                                fontWeight: FontWeight.w700,
                                color: Color(0xFF0F172A),
                              ),
                            ),
                            const SizedBox(width: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 7,
                                vertical: 2,
                              ),
                              decoration: BoxDecoration(
                                color: badgeBgColor,
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Text(
                                badgeText,
                                style: TextStyle(
                                  fontSize: 9.5,
                                  fontWeight: FontWeight.w700,
                                  color: badgeTextColor,
                                ),
                              ),
                            ),
                          ],
                        ),

                        const SizedBox(height: 3),

                        Text(
                          description,
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                            color: Color(0xFF64748B),
                            height: 1.25,
                          ),
                        ),

                        const SizedBox(height: 8),

                        // Feature Pills
                        Wrap(
                          spacing: 6,
                          runSpacing: 4,
                          children: featurePills,
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _FeaturePill extends StatelessWidget {
  final Color? dotColor;
  final String text;

  const _FeaturePill({
    this.dotColor,
    required this.text,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
      decoration: BoxDecoration(
        color: const Color(0xFFF1F5F9),
        borderRadius: BorderRadius.circular(5),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (dotColor != null) ...[
            Container(
              width: 5,
              height: 5,
              decoration: BoxDecoration(
                color: dotColor,
                shape: BoxShape.circle,
              ),
            ),
            const SizedBox(width: 5),
          ],
          Text(
            text,
            style: const TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w600,
              color: Color(0xFF475569),
            ),
          ),
        ],
      ),
    );
  }
}
