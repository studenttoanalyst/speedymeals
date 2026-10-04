import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';

import '../../core/network/api_exception.dart';
import '../../data/models/rider_models.dart';
import '../../data/repositories/rider_repository.dart';

/// Rider document upload screen — lets the rider upload CNIC, license,
/// and vehicle photos required for onboarding approval.
///
/// Backed by:
///   POST /wallet/documents/{doc_type}  → upload a document (JPG/PNG, 5 MB max)
///   GET  /wallet/profile               → re-read after upload to get updated status
///
/// The backend is the source of truth: document types are
/// `cnic`, `license`, `vehicle`. Re-uploading the same type overwrites the
/// previous file. Only JPG/PNG files up to 5 MB are accepted.
class RiderDocumentsScreen extends StatefulWidget {
  const RiderDocumentsScreen({super.key});

  @override
  State<RiderDocumentsScreen> createState() => _RiderDocumentsScreenState();
}

class _RiderDocumentsScreenState extends State<RiderDocumentsScreen> {
  static const Color _bg = Color(0xFF0F172A);
  static const Color _card = Color(0xFF1E293B);
  static const Color _border = Color(0xFF334155);
  static const Color _green = Color(0xFF10B981);
  static const Color _red = Color(0xFFDC2626);
  static const Color _blue = Color(0xFF3B82F6);

  final RiderRepository _repository = RiderRepository();

  RiderProfile? _profile;
  bool _isLoading = true;
  ApiException? _error;

  /// Which doc type is currently uploading (null when idle).
  String? _uploadingDocType;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final profile = await _repository.profile();
      if (!mounted) return;
      setState(() {
        _profile = profile;
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

  /// Pick a file and upload it for the given [docType].
  Future<void> _pickAndUpload(String docType) async {
    if (_uploadingDocType != null) return;

    try {
      final files = await FilePicker.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['jpg', 'jpeg', 'png'],
      );

      if (files.isEmpty) return;
      if (!mounted) return;

      final file = files.first;
      final bytes = await file.readAsBytes();
      if (!mounted) return;
      if (bytes.isEmpty) {
        _showError('Could not read the selected file. Please try again.');
        return;
      }

      final filename = file.name;
      final contentType = _inferContentType(filename);

      setState(() => _uploadingDocType = docType);

      try {
        final updatedProfile = await _repository.uploadDocument(
          docType: docType,
          bytes: bytes,
          filename: filename,
          contentType: contentType,
        );
        if (!mounted) return;
        setState(() {
          _profile = updatedProfile;
          _uploadingDocType = null;
        });
        _showMessage(
          _uploadedMessage(docType),
          _green,
        );
      } on ApiException catch (error) {
        if (!mounted) return;
        setState(() => _uploadingDocType = null);
        _showError(error.message);
      }
    } on ApiException catch (error) {
      if (!mounted) return;
      setState(() => _uploadingDocType = null);
      _showError(error.message);
    } catch (error) {
      if (!mounted) return;
      setState(() => _uploadingDocType = null);
      _showError('An unexpected error occurred. Please try again.');
    }
  }

  String _inferContentType(String filename) {
    final lower = filename.toLowerCase();
    if (lower.endsWith('.png')) return 'image/png';
    return 'image/jpeg';
  }

  String _uploadedMessage(String docType) {
    switch (docType) {
      case 'cnic':
        return 'CNIC photo uploaded successfully.';
      case 'license':
        return 'License photo uploaded successfully.';
      case 'vehicle':
        return 'Vehicle photo uploaded successfully.';
      default:
        return 'Document uploaded successfully.';
    }
  }

  void _showError(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
      ..clearSnackBars()
      ..showSnackBar(
        SnackBar(
          content: Text(message),
          backgroundColor: _red,
          behavior: SnackBarBehavior.floating,
        ),
      );
  }

  void _showMessage(String message, Color color) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
      ..clearSnackBars()
      ..showSnackBar(
        SnackBar(
          content: Text(message),
          backgroundColor: color,
          behavior: SnackBarBehavior.floating,
        ),
      );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _bg,
      appBar: AppBar(
        backgroundColor: _card,
        elevation: 2,
        iconTheme: const IconThemeData(color: Colors.white),
        title: const Text(
          'Documents & Verification',
          style: TextStyle(color: Colors.white),
        ),
        actions: [
          IconButton(
            onPressed: _load,
            icon: const Icon(Icons.refresh_rounded, color: Colors.white70),
            tooltip: 'Refresh',
          ),
        ],
      ),
      body: SafeArea(child: _buildBody()),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    final failure = _error;
    if (failure != null && _profile == null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline_rounded, size: 52, color: _red),
              const SizedBox(height: 16),
              const Text(
                'Could not load your documents',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                failure.message,
                style: const TextStyle(color: Color(0xFF94A3B8)),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 20),
              FilledButton.icon(
                onPressed: _load,
                icon: const Icon(Icons.refresh_rounded, size: 18),
                label: const Text('Try again'),
              ),
            ],
          ),
        ),
      );
    }

    final profile = _profile!;
    final allUploaded = profile.hasAllDocuments;

    return RefreshIndicator(
      onRefresh: _load,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Approval status banner
            _buildApprovalBanner(profile),
            const SizedBox(height: 20),

            // Header
            const Text(
              'Required Documents',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w800,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'Upload clear photos of each document. JPG/PNG only, max 5 MB.',
              style: TextStyle(
                fontSize: 13,
                color: const Color(0xFF94A3B8),
                height: 1.4,
              ),
            ),
            const SizedBox(height: 16),

            // Progress indicator
            _buildProgressIndicator(profile),
            const SizedBox(height: 20),

            // Document cards
            _DocumentCard(
              docType: 'cnic',
              title: 'CNIC (Front)',
              subtitle: 'National Identity Card photo',
              icon: Icons.badge_rounded,
              isUploaded: profile.hasCnicPhoto,
              isUploading: _uploadingDocType == 'cnic',
              onUpload: () => _pickAndUpload('cnic'),
              cardColor: _card,
              borderColor: _border,
              green: _green,
              blue: _blue,
            ),
            const SizedBox(height: 12),
            _DocumentCard(
              docType: 'license',
              title: 'Driving License',
              subtitle: 'Valid driving license photo',
              icon: Icons.card_membership_rounded,
              isUploaded: profile.hasLicensePhoto,
              isUploading: _uploadingDocType == 'license',
              onUpload: () => _pickAndUpload('license'),
              cardColor: _card,
              borderColor: _border,
              green: _green,
              blue: _blue,
            ),
            const SizedBox(height: 12),
            _DocumentCard(
              docType: 'vehicle',
              title: 'Vehicle Registration',
              subtitle: 'Vehicle registration book photo',
              icon: Icons.two_wheeler_rounded,
              isUploaded: profile.hasVehiclePhoto,
              isUploading: _uploadingDocType == 'vehicle',
              onUpload: () => _pickAndUpload('vehicle'),
              cardColor: _card,
              borderColor: _border,
              green: _green,
              blue: _blue,
            ),
            const SizedBox(height: 24),

            // Info text
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFF1E3A8A).withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: _blue.withValues(alpha: 0.3),
                ),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.info_outline_rounded, color: _blue, size: 20),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      allUploaded
                          ? 'All documents are uploaded. An administrator will review them shortly. You will be notified once your account is approved.'
                          : 'All three documents are required before your account can be approved for deliveries. Upload clear, readable photos.',
                      style: const TextStyle(
                        fontSize: 12.5,
                        color: Color(0xFFCBD5E1),
                        height: 1.4,
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

  Widget _buildApprovalBanner(RiderProfile profile) {
    if (profile.isApproved) {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: _green.withValues(alpha: 0.14),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: _green.withValues(alpha: 0.4)),
        ),
        child: Row(
          children: [
            const Icon(Icons.check_circle_outline_rounded, color: _green),
            const SizedBox(width: 12),
            const Expanded(
              child: Text(
                'Your account is approved. You can accept deliveries.',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: Colors.white,
                ),
              ),
            ),
          ],
        ),
      );
    }

    final isRejected = profile.isRejected;
    final color = isRejected ? _red : const Color(0xFFF59E0B);
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.14),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withValues(alpha: 0.4)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            isRejected
                ? Icons.cancel_outlined
                : Icons.hourglass_top_rounded,
            color: color,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              isRejected
                  ? 'Your documents were not approved. Contact support to resolve this.'
                  : 'Your account is pending approval. Upload all documents and an administrator will review them.',
              style: const TextStyle(
                fontSize: 12.5,
                color: Color(0xFFCBD5E1),
                height: 1.4,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildProgressIndicator(RiderProfile profile) {
    final count = profile.uploadedDocumentCount;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              '$count of 3 uploaded',
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: Colors.white,
              ),
            ),
            if (count == 3)
              const Text(
                'Complete',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: _green,
                ),
              ),
          ],
        ),
        const SizedBox(height: 8),
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: LinearProgressIndicator(
            value: count / 3,
            backgroundColor: _border,
            valueColor: AlwaysStoppedAnimation<Color>(
              count == 3 ? _green : _blue,
            ),
            minHeight: 6,
          ),
        ),
      ],
    );
  }
}

/// A single document upload card with status, upload button, and loading state.
class _DocumentCard extends StatelessWidget {
  const _DocumentCard({
    required this.docType,
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.isUploaded,
    required this.isUploading,
    required this.onUpload,
    required this.cardColor,
    required this.borderColor,
    required this.green,
    required this.blue,
  });

  final String docType;
  final String title;
  final String subtitle;
  final IconData icon;
  final bool isUploaded;
  final bool isUploading;
  final VoidCallback onUpload;
  final Color cardColor;
  final Color borderColor;
  final Color green;
  final Color blue;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: cardColor,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: isUploaded ? green.withValues(alpha: 0.5) : borderColor,
        ),
      ),
      child: Row(
        children: [
          // Icon
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: isUploaded
                  ? green.withValues(alpha: 0.15)
                  : blue.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              icon,
              color: isUploaded ? green : blue,
              size: 24,
            ),
          ),
          const SizedBox(width: 14),

          // Title + subtitle
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: const TextStyle(
                    fontSize: 12,
                    color: Color(0xFF94A3B8),
                  ),
                ),
              ],
            ),
          ),

          // Action
          if (isUploading)
            const SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(strokeWidth: 2),
            )
          else if (isUploaded)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              decoration: BoxDecoration(
                color: green.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.check_rounded, color: green, size: 16),
                  const SizedBox(width: 4),
                  Text(
                    'Uploaded',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: green,
                    ),
                  ),
                ],
              ),
            )
          else
            ElevatedButton.icon(
              onPressed: onUpload,
              style: ElevatedButton.styleFrom(
                backgroundColor: blue,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 8,
                ),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
              icon: const Icon(Icons.upload_rounded, size: 16),
              label: const Text(
                'Upload',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
        ],
      ),
    );
  }
}
