import 'package:flutter/material.dart';

import '../../core/constants/app_constants.dart';
import '../../core/network/api_exception.dart';
import '../../data/models/deletion_models.dart';
import '../../data/repositories/rider_repository.dart';
import '../../widgets/legal_links.dart';

/// Rider account screen: request an account deletion, follow its status, and
/// cancel it while the rider is still allowed to.
///
/// Backed by:
///   DELETE  /users/me                        → create the deferred request
///   GET     /users/me/deletion-request       → status + dates (null when none)
///   POST    /users/me/deletion-request/cancel → cancel, reactivates account
///
/// Policy this screen mirrors (identical wording to the backend and the web
/// page, so a rider never gets two different stories):
///   * the account is deactivated the moment the request is made;
///   * after 7 days the request goes to admin review;
///   * deletion happens only after approval and only with no pending dues;
///   * the rider can cancel while the request is pending or under review.
class RiderAccountScreen extends StatefulWidget {
  /// [repository] is injectable so widget tests can drive the status card
  /// without a backend; production screens construct with no arguments.
  const RiderAccountScreen({super.key, this.repository});

  final RiderRepository? repository;

  /// Exact copy approved for the confirmation dialog. Kept as a public
  /// constant so a test can assert the app ships the agreed wording verbatim.
  static const String deletionDialogCopy =
      'Your account will be deactivated now. After 7 days your request goes to '
      'admin review. Deletion happens only after approval and only if you have '
      'no pending dues. You can cancel before then.';

  @override
  State<RiderAccountScreen> createState() => _RiderAccountScreenState();
}

class _RiderAccountScreenState extends State<RiderAccountScreen> {
  static const Color _bg = Color(0xFF0F172A);
  static const Color _card = Color(0xFF1E293B);
  static const Color _border = Color(0xFF334155);
  static const Color _green = Color(0xFF10B981);
  static const Color _red = Color(0xFFDC2626);
  static const Color _amber = Color(0xFFF59E0B);
  static const Color _blue = Color(0xFF3B82F6);
  static const Color _muted = Color(0xFF94A3B8);

  late final RiderRepository _repository;

  DeletionRequest? _request;
  bool _isLoading = true;
  bool _isBusy = false;
  ApiException? _error;

  @override
  void initState() {
    super.initState();
    _repository = widget.repository ?? RiderRepository();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final request = await _repository.deletionRequest();
      if (!mounted) return;
      setState(() {
        _request = request;
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

  // ----------------------------------------------------------------- actions

  Future<void> _requestDeletion() async {
    if (_isBusy) return;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('Request account deletion?'),
        content: const Text(RiderAccountScreen.deletionDialogCopy),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text('Keep my account'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            style: FilledButton.styleFrom(
              backgroundColor: Theme.of(context).colorScheme.error,
            ),
            child: const Text('Request deletion'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;

    setState(() => _isBusy = true);
    try {
      final action = await _repository.requestAccountDeletion();
      if (!mounted) return;
      setState(() => _request = action.request);
      _showMessage(action.message);
    } on ApiException catch (error) {
      if (!mounted) return;
      // 409 (active delivery) and every other refusal come back user-ready
      // from the backend and are shown verbatim.
      _showError(error.message);
    } catch (_) {
      if (!mounted) return;
      _showError('Could not request account deletion. Please try again.');
    } finally {
      if (mounted) setState(() => _isBusy = false);
    }
  }

  Future<void> _cancelDeletion() async {
    if (_isBusy) return;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('Cancel deletion request?'),
        content: const Text(
          'Your account becomes active again and keeps working as before. '
          'You can always start a new deletion request later.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text('No, keep it'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            child: const Text('Cancel request'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;

    setState(() => _isBusy = true);
    try {
      final action = await _repository.cancelDeletionRequest();
      if (!mounted) return;
      setState(() => _request = action.request);
      _showMessage(action.message);
    } on ApiException catch (error) {
      if (!mounted) return;
      _showError(error.message);
      // The refusal may mean the state moved on (e.g. an admin already
      // approved): re-read so the screen shows the truth, not a stale copy.
      await _load();
    } catch (_) {
      if (!mounted) return;
      _showError('Could not cancel the request. Please try again.');
    } finally {
      if (mounted) setState(() => _isBusy = false);
    }
  }

  void _showMessage(String text) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
      ..clearSnackBars()
      ..showSnackBar(
        SnackBar(
          content: Text(text),
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      );
  }

  void _showError(String text) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
      ..clearSnackBars()
      ..showSnackBar(
        SnackBar(
          content: Text(text),
          backgroundColor: _red,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      );
  }

  // ------------------------------------------------------------------- build

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _bg,
      appBar: AppBar(
        backgroundColor: _card,
        elevation: 2,
        title: const Text(
          'Account',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Colors.white),
        ),
      ),
      body: SafeArea(child: _buildBody()),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(color: _red, strokeWidth: 3),
      );
    }

    final failure = _error;
    if (failure != null && _request == null) {
      return _errorCard(failure);
    }

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _request == null ? _noRequestCard() : _statusCard(_request!),
        const SizedBox(height: 16),
        _webDeletionCard(),
        const SizedBox(height: 16),
        _legalCard(),
        const SizedBox(height: 24),
      ],
    );
  }

  Widget _errorCard(ApiException failure) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              failure.kind == ApiErrorKind.network
                  ? Icons.wifi_off_rounded
                  : Icons.error_outline_rounded,
              size: 52,
              color: _red,
            ),
            const SizedBox(height: 12),
            Text(
              failure.message,
              textAlign: TextAlign.center,
              style: const TextStyle(color: Colors.white70, fontSize: 14),
            ),
            const SizedBox(height: 16),
            OutlinedButton(onPressed: _load, child: const Text('Try again')),
          ],
        ),
      ),
    );
  }

  // ------------------------------------------------------------------ cards

  Widget _noRequestCard() {
    return _panel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.shield_outlined, color: _blue, size: 20),
              SizedBox(width: 8),
              Text(
                'Account deletion',
                style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 15),
              ),
            ],
          ),
          const SizedBox(height: 12),
          const Text(
            'You can request the deletion of your rider account from this '
            'screen, or from the website without signing in.',
            style: TextStyle(color: _muted, fontSize: 13, height: 1.5),
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: _isBusy ? null : _requestDeletion,
              style: FilledButton.styleFrom(backgroundColor: _red),
              icon: _isBusy
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : const Icon(Icons.delete_forever_outlined, size: 18),
              label: const Text('Request Account Deletion'),
            ),
          ),
        ],
      ),
    );
  }  Widget _statusCard(DeletionRequest request) {
    final status = request.status;
    final chipColor = switch (status) {
      DeletionRequestStatus.pending => _blue,
      DeletionRequestStatus.readyForReview => _amber,
      DeletionRequestStatus.onHold => _amber,
      DeletionRequestStatus.completed => _green,
      DeletionRequestStatus.approved => _green,
      DeletionRequestStatus.cancelled => _muted,
      DeletionRequestStatus.unknown => _muted,
    };

    return _panel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: chipColor.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(999),
                  border: Border.all(color: chipColor),
                ),
                child: Text(
                  status.label,
                  style: TextStyle(
                    color: chipColor,
                    fontSize: 12,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              const Spacer(),
              if (_isBusy)
                const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            status.description,
            style: const TextStyle(color: Colors.white70, fontSize: 13, height: 1.5),
          ),
          const SizedBox(height: 16),
          _dateRow('Requested', request.requestedDateLabel),
          if (status == DeletionRequestStatus.pending)
            _dateRow('Review starts', '${request.graceEndsLabel} '
                '(${request.daysUntilReview} day${request.daysUntilReview == 1 ? '' : 's'} left)'),
          if (request.reviewedLabel != null)
            _dateRow('Reviewed', request.reviewedLabel),
          if (request.holdReason != null && request.holdReason!.trim().isNotEmpty) ...[
            const SizedBox(height: 12),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: _amber.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: _amber.withValues(alpha: 0.5)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Reason',
                    style: TextStyle(color: _amber, fontSize: 12, fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    request.holdReason!,
                    style: const TextStyle(color: Colors.white70, fontSize: 13, height: 1.4),
                  ),
                ],
              ),
            ),
          ],
          if (request.adminNote != null && request.adminNote!.trim().isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              request.adminNote!,
              style: const TextStyle(color: _muted, fontSize: 12, height: 1.4),
            ),
          ],
          const SizedBox(height: 16),
          if (request.canCancel)
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: _isBusy ? null : _cancelDeletion,
                style: OutlinedButton.styleFrom(
                  foregroundColor: _red,
                  side: const BorderSide(color: _red),
                ),
                icon: const Icon(Icons.undo_rounded, size: 18),
                label: const Text('Cancel deletion request'),
              ),
            )
          else if (status == DeletionRequestStatus.cancelled)
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: _isBusy ? null : _requestDeletion,
                style: FilledButton.styleFrom(backgroundColor: _red),
                icon: const Icon(Icons.delete_forever_outlined, size: 18),
                label: const Text('Request Account Deletion'),
              ),
            )
          else
            const Text(
              'Need help with this request? Contact '
              '${AppConstants.supportEmail}.',
              style: TextStyle(color: _muted, fontSize: 12),
            ),
        ],
      ),
    );
  }

  Widget _dateRow(String label, String? value) {
    if (value == null) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        children: [
          Text('$label: ', style: const TextStyle(color: _muted, fontSize: 13)),
          Text(
            value,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 13,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  Widget _webDeletionCard() {
    return _panel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.language_rounded, color: _blue, size: 20),
              SizedBox(width: 8),
              Text(
                'Delete your account from the web',
                style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 15),
              ),
            ],
          ),
          const SizedBox(height: 12),
          const Text(
            'Deletion is also possible without the app, using your phone '
            'number and an SMS code. The same 7-day grace and admin review '
            'apply there.',
            style: TextStyle(color: _muted, fontSize: 13, height: 1.5),
          ),
          const SizedBox(height: 12),
          Align(
            alignment: Alignment.centerLeft,
            child: TextButton.icon(
              onPressed: () => LegalUtils.openDeleteAccount(context),
              icon: const Icon(Icons.open_in_new_rounded, size: 18),
              label: const Text(AppConstants.deleteAccountUrl),
            ),
          ),
        ],
      ),
    );
  }

  Widget _legalCard() {
    return _panel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Your data',
            style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 15),
          ),
          const SizedBox(height: 8),
          const Text(
            'Orders and payment records are kept in anonymised form for '
            'accounting and legal purposes. Your CNIC, licence and vehicle '
            'photos are removed only on the admin\'s decision.',
            style: TextStyle(color: _muted, fontSize: 13, height: 1.5),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              TextButton(
                onPressed: () => LegalUtils.openTerms(context),
                child: const Text('Terms'),
              ),
              TextButton(
                onPressed: () => LegalUtils.openPrivacy(context),
                child: const Text('Privacy Policy'),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _panel({required Widget child}) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: _card,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: _border),
      ),
      child: child,
    );
  }
}
