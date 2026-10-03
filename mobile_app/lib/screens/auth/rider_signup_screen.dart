import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../data/repositories/auth_repository.dart';
import '../../services/auth_service.dart';
import 'otp_verification_screen.dart';
import 'rider_login_screen.dart';

/// Delivery Rider Sign Up Screen matching clean design system & Stitch guidelines.
class RiderSignUpScreen extends StatefulWidget {
  const RiderSignUpScreen({super.key});

  @override
  State<RiderSignUpScreen> createState() => _RiderSignUpScreenState();
}

class _RiderSignUpScreenState extends State<RiderSignUpScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();

  /// `riders.cnic_number` is NOT NULL and UNIQUE on the backend, so it is a
  /// required part of rider signup.
  final _cnicController = TextEditingController();

  /// `riders.vehicle_registration` — optional on the backend.
  final _vehicleRegistrationController = TextEditingController();

  String? _selectedVehicle = 'Motorcycle';

  bool _agreeToTerms = true;
  bool _isLoading = false;

  final List<String> _vehicles = ['Motorcycle', 'Scooter', 'Bicycle', 'Car'];

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _cnicController.dispose();
    _vehicleRegistrationController.dispose();
    super.dispose();
  }

  Future<void> _handleRiderRegister() async {
    if (!_formKey.currentState!.validate()) return;

    if (!_agreeToTerms) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Please accept the Fleet Terms & Partner Policy.'),
          backgroundColor: const Color(0xFFDC2626),
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      );
      return;
    }

    if (_isLoading) return;

    setState(() {
      _isLoading = true;
    });

    try {
      // Step 1: request the verification code for this phone number.
      //
      // The signup details travel with the VERIFY call, not this one: on a
      // first-time phone number `POST /auth/rider/otp/verify` creates the
      // `riders` row with `approval_status = "pending"` — a rider is not
      // allowed to work until an admin approves them.
      await AuthService.instance.requestOtp(
        phoneNumber: _phoneController.text.trim(),
        role: UserRole.rider,
      );

      if (!mounted) return;

      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => OtpVerificationScreen(
            role: UserRole.rider,
            riderSignup: RiderSignupDetails(
              name: _nameController.text.trim(),
              cnicNumber: _cnicController.text.trim(),
              vehicleType: _selectedVehicle,
              vehicleRegistration:
                  _vehicleRegistrationController.text.trim().isEmpty
                      ? null
                      : _vehicleRegistrationController.text.trim(),
            ),
          ),
        ),
      );
    } on AuthException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(e.message),
          backgroundColor: const Color(0xFFDC2626),
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      );
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('An unexpected error occurred. Please try again.'),
          backgroundColor: const Color(0xFFDC2626),
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      );
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: SafeArea(
        child: Column(
          children: [
            // Top Navigation Bar
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  InkWell(
                    onTap: () => Navigator.pop(context),
                    borderRadius: BorderRadius.circular(20),
                    child: Container(
                      width: 40,
                      height: 40,
                      decoration: const BoxDecoration(
                        color: Color(0xFFF1F5F9),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.arrow_back_rounded,
                        color: Color(0xFF334155),
                        size: 20,
                      ),
                    ),
                  ),

                  // Header Badge
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEFF6FF),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: const Color(0xFFDBEAFE)),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: const [
                        Icon(
                          Icons.delivery_dining_rounded,
                          size: 16,
                          color: Color(0xFF1D4ED8),
                        ),
                        SizedBox(width: 6),
                        Text(
                          'Rider Application',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFF1D4ED8),
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(width: 40),
                ],
              ),
            ),

            // Scrollable Form
            Expanded(
              child: SingleChildScrollView(
                physics: const BouncingScrollPhysics(),
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Form(
                  key: _formKey,
                  child: Column(
                    children: [
                      const SizedBox(height: 8),

                      // Header Motif
                      _buildRiderMotif(),

                      const SizedBox(height: 12),

                      Text(
                        'Become a Delivery Rider',
                        style: theme.textTheme.displayLarge?.copyWith(
                          fontSize: 24,
                          fontWeight: FontWeight.w800,
                          color: const Color(0xFF0F172A),
                        ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 4),
                      const Text(
                        'Join Speedy Meals fleet & earn daily with flexible hours',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w500,
                          color: Color(0xFF64748B),
                        ),
                        textAlign: TextAlign.center,
                      ),

                      const SizedBox(height: 20),

                      // Full Name
                      _buildFieldLabel('Full Name'),
                      const SizedBox(height: 6),
                      TextFormField(
                        controller: _nameController,
                        keyboardType: TextInputType.name,
                        textCapitalization: TextCapitalization.words,
                        decoration: _inputDecoration(
                          hint: 'e.g. Marcus Vance',
                          prefixIcon: Icons.person_outline_rounded,
                        ),
                        validator: (val) {
                          if (val == null || val.trim().isEmpty) {
                            return 'Please enter your full name';
                          }
                          return null;
                        },
                      ),

                      const SizedBox(height: 14),

                      // Responsive Layout for CNIC & Phone
                      LayoutBuilder(
                        builder: (context, constraints) {
                          if (constraints.maxWidth < 340) {
                            return Column(
                              children: [
                                _buildCnicField(),
                                const SizedBox(height: 14),
                                _buildPhoneField(),
                              ],
                            );
                          }
                          return Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Expanded(child: _buildCnicField()),
                              const SizedBox(width: 12),
                              Expanded(child: _buildPhoneField()),
                            ],
                          );
                        },
                      ),

                      const SizedBox(height: 14),

                      // Responsive Layout for Vehicle Type & Registration
                      LayoutBuilder(
                        builder: (context, constraints) {
                          if (constraints.maxWidth < 340) {
                            return Column(
                              children: [
                                _buildVehicleDropdown(),
                                const SizedBox(height: 14),
                                _buildVehicleRegistrationField(),
                              ],
                            );
                          }
                          return Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Expanded(child: _buildVehicleDropdown()),
                              const SizedBox(width: 12),
                              Expanded(child: _buildVehicleRegistrationField()),
                            ],
                          );
                        },
                      ),

                      const SizedBox(height: 6),

                      // Riders sign in with a one-time code, so no password is
                      // collected. Your CNIC photo and licence are uploaded from
                      // the rider dashboard after your first sign-in.
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF1F5F9),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: const [
                            Icon(
                              Icons.verified_user_outlined,
                              size: 16,
                              color: Color(0xFF64748B),
                            ),
                            SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                'A 6-digit code will be texted to your number to '
                                'verify your application. No password needed.',
                                style: TextStyle(
                                  fontSize: 11.5,
                                  fontWeight: FontWeight.w500,
                                  color: Color(0xFF64748B),
                                  height: 1.4,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: 14),

                      // Terms Checkbox
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.center,
                        children: [
                          SizedBox(
                            width: 24,
                            height: 24,
                            child: Checkbox(
                              value: _agreeToTerms,
                              activeColor: const Color(0xFFDC2626),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(4),
                              ),
                              onChanged: (val) {
                                setState(() {
                                  _agreeToTerms = val ?? false;
                                });
                              },
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: RichText(
                              text: TextSpan(
                                style: const TextStyle(
                                  fontSize: 12,
                                  color: Color(0xFF64748B),
                                ),
                                children: const [
                                  TextSpan(text: 'I agree to the '),
                                  TextSpan(
                                    text: 'Fleet Partner Terms',
                                    style: TextStyle(
                                      color: Color(0xFFDC2626),
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                  TextSpan(text: ' & '),
                                  TextSpan(
                                    text: 'Code of Conduct',
                                    style: TextStyle(
                                      color: Color(0xFFDC2626),
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),

                      const SizedBox(height: 20),

                      // Submit Application Button
                      SizedBox(
                        width: double.infinity,
                        height: 52,
                        child: ElevatedButton(
                          onPressed: _isLoading ? null : _handleRiderRegister,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFFDC2626),
                            disabledBackgroundColor: const Color(0xFFCBD5E1),
                            elevation: _isLoading ? 0 : 4,
                            shadowColor:
                                const Color(0xFFDC2626).withValues(alpha: 0.35),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16),
                            ),
                          ),
                          child: _isLoading
                              ? const SizedBox(
                                  width: 22,
                                  height: 22,
                                  child: CircularProgressIndicator(
                                    color: Colors.white,
                                    strokeWidth: 2.5,
                                  ),
                                )
                              : Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: const [
                                    Text(
                                      'Submit Application',
                                      style: TextStyle(
                                        fontSize: 16,
                                        fontWeight: FontWeight.w700,
                                        color: Colors.white,
                                      ),
                                    ),
                                    SizedBox(width: 8),
                                    Icon(
                                      Icons.arrow_forward_rounded,
                                      size: 18,
                                      color: Colors.white,
                                    ),
                                  ],
                                ),
                        ),
                      ),

                      const SizedBox(height: 24),
                    ],
                  ),
                ),
              ),
            ),

            // Footer Switch to Login
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 16),
              decoration: const BoxDecoration(
                color: Colors.white,
                border: Border(
                  top: BorderSide(color: Color(0xFFF1F5F9), width: 1),
                ),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text(
                    'Already registered as a rider? ',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF64748B),
                    ),
                  ),
                  GestureDetector(
                    onTap: () {
                      Navigator.pushReplacement(
                        context,
                        MaterialPageRoute(
                          builder: (context) => const RiderLoginScreen(),
                        ),
                      );
                    },
                    child: const Text(
                      'Sign In',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFFDC2626),
                      ),
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

  /// CNIC number — required and unique on the backend, so it replaces the old
  /// (unused, unsupported) rider email field in this layout.
  Widget _buildCnicField() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildFieldLabel('CNIC Number'),
        const SizedBox(height: 6),
        TextFormField(
          controller: _cnicController,
          keyboardType: TextInputType.number,
          inputFormatters: [
            FilteringTextInputFormatter.allow(RegExp(r'[0-9\-]')),
            LengthLimitingTextInputFormatter(15),
          ],
          decoration: _inputDecoration(
            hint: '42101-1234567-8',
            prefixIcon: Icons.badge_outlined,
          ),
          validator: (val) {
            final digits = (val ?? '').replaceAll(RegExp(r'[^0-9]'), '');
            if (digits.isEmpty) {
              return 'CNIC required';
            }
            // 13 digits: XXXXX-XXXXXXX-X
            if (digits.length != 13) {
              return 'Enter 13 digits';
            }
            return null;
          },
        ),
      ],
    );
  }

  Widget _buildPhoneField() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildFieldLabel('Phone Number'),
        const SizedBox(height: 6),
        TextFormField(
          controller: _phoneController,
          keyboardType: TextInputType.phone,
          decoration: _inputDecoration(
            hint: '300 1234567',
            prefixIcon: Icons.phone_iphone_rounded,
          ).copyWith(
            prefixText: '+92 ',
            prefixStyle: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: Color(0xFF334155),
            ),
          ),
          validator: (val) {
            final digits = (val ?? '').replaceAll(RegExp(r'[^0-9]'), '');
            if (digits.isEmpty) {
              return 'Phone required';
            }
            if (digits.length < 10) {
              return 'Enter a complete number';
            }
            return null;
          },
        ),
      ],
    );
  }

  Widget _buildVehicleDropdown() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildFieldLabel('Vehicle Type'),
        const SizedBox(height: 6),
        DropdownButtonFormField<String>(
          initialValue: _selectedVehicle,
          decoration: _inputDecoration(
            hint: 'Select',
            prefixIcon: Icons.directions_bike_rounded,
          ),
          items: _vehicles.map((v) {
            return DropdownMenuItem(
              value: v,
              child: Text(v, style: const TextStyle(fontSize: 13)),
            );
          }).toList(),
          onChanged: (val) {
            setState(() {
              _selectedVehicle = val;
            });
          },
          validator: (val) => val == null ? 'Select vehicle' : null,
        ),
      ],
    );
  }

  /// Vehicle registration plate. Optional on the backend, and replaces the old
  /// "Operating City" dropdown — the backend has no city field on `riders`, so
  /// collecting one would have been dead data.
  Widget _buildVehicleRegistrationField() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildFieldLabel('Registration No.'),
        const SizedBox(height: 6),
        TextFormField(
          controller: _vehicleRegistrationController,
          textCapitalization: TextCapitalization.characters,
          decoration: _inputDecoration(
            hint: 'ABC-1234',
            prefixIcon: Icons.pin_outlined,
          ),
        ),
      ],
    );
  }

  Widget _buildRiderMotif() {
    return Column(
      children: [
        Stack(
          clipBehavior: Clip.none,
          children: [
            Container(
              width: 72,
              height: 72,
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: const Color(0xFFF1F5F9), width: 1.5),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.05),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
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
              right: -4,
              bottom: -4,
              child: Container(
                padding: const EdgeInsets.all(5),
                decoration: const BoxDecoration(
                  color: Color(0xFFDC2626),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.two_wheeler_rounded,
                  color: Colors.white,
                  size: 12,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 6),
        const Text(
          'SPEEDY MEALS FLEET',
          style: TextStyle(
            fontSize: 10,
            fontWeight: FontWeight.w800,
            color: Color(0xFFDC2626),
            letterSpacing: 2.0,
          ),
        ),
      ],
    );
  }

  Widget _buildFieldLabel(String label) {
    return Align(
      alignment: Alignment.centerLeft,
      child: Text(
        label,
        style: const TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w700,
          color: Color(0xFF334155),
        ),
      ),
    );
  }

  InputDecoration _inputDecoration({
    required String hint,
    required IconData prefixIcon,
    Widget? suffixIcon,
  }) {
    return InputDecoration(
      hintText: hint,
      hintStyle: const TextStyle(
        fontSize: 13,
        fontWeight: FontWeight.w400,
        color: Color(0xFF94A3B8),
      ),
      prefixIcon: Icon(prefixIcon, color: const Color(0xFF94A3B8), size: 18),
      suffixIcon: suffixIcon,
      filled: true,
      fillColor: Colors.white,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: Color(0xFFDC2626), width: 2),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: Color(0xFFDC2626)),
      ),
    );
  }
}
