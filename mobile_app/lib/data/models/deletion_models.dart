import '../json_utils.dart';

/// Wire values of `deletion_requests.status` (backend
/// `platform/account_deletion/models.py`). The app never invents a state: an
/// unrecognised value maps to [unknown] instead of crashing a screen, and the
/// UI then falls back to a generic "contact support" card.
enum DeletionRequestStatus {
  /// Requested, inside the 7-day grace period, account deactivated.
  pending,

  /// Grace period over; waiting for an admin decision.
  readyForReview,

  /// An admin paused it (dues appeared, verification needed, …). The reason
  /// comes back in `hold_reason` and is shown verbatim.
  onHold,

  /// Approved and executing (transient server-side).
  approved,

  /// Finished: data anonymised, KYC handled per the admin's decision.
  completed,

  /// Cancelled by the rider before review; the account is active again.
  cancelled,

  unknown;

  static DeletionRequestStatus fromWire(Object? raw) {
    switch (raw) {
      case 'pending':
        return DeletionRequestStatus.pending;
      case 'ready_for_review':
        return DeletionRequestStatus.readyForReview;
      case 'on_hold':
        return DeletionRequestStatus.onHold;
      case 'approved':
        return DeletionRequestStatus.approved;
      case 'completed':
        return DeletionRequestStatus.completed;
      case 'cancelled':
        return DeletionRequestStatus.cancelled;
      default:
        return DeletionRequestStatus.unknown;
    }
  }

  /// Short label for the status chip.
  String get label => switch (this) {
        DeletionRequestStatus.pending => 'Pending',
        DeletionRequestStatus.readyForReview => 'Under review',
        DeletionRequestStatus.onHold => 'On hold',
        DeletionRequestStatus.approved => 'Approved',
        DeletionRequestStatus.completed => 'Completed',
        DeletionRequestStatus.cancelled => 'Cancelled',
        DeletionRequestStatus.unknown => 'Unknown',
      };

  /// One-line explanation of what the status means for the rider. Kept
  /// consistent with the confirmation dialog's wording (7-day grace, admin
  /// review, dues rule) so the app never tells two different stories.
  String get description => switch (this) {
        DeletionRequestStatus.pending =>
          'Your account is deactivated. After 7 days this request goes to admin review. You can cancel it before then.',
        DeletionRequestStatus.readyForReview =>
          'Your grace period has ended. An admin is reviewing your request. You can still cancel it.',
        DeletionRequestStatus.onHold =>
          'An admin paused this request. See the reason below and contact support.',
        DeletionRequestStatus.approved =>
          'Your request was approved and is being processed.',
        DeletionRequestStatus.completed =>
          'Your account and personal data have been deleted. Order and payment records are kept in anonymised form.',
        DeletionRequestStatus.cancelled =>
          'This request was cancelled and your account is active again.',
        DeletionRequestStatus.unknown =>
          'We could not read this request. Please contact support.',
      };

  /// True while the rider may still call the cancel endpoint (server rule:
  /// `pending` and `ready_for_review` only).
  bool get canBeCancelled =>
      this == DeletionRequestStatus.pending ||
      this == DeletionRequestStatus.readyForReview;
}

/// One row of `deletion_requests`, as the account holder sees it
/// (`DeletionRequestResponseSchema`).
///
/// Deliberately contains no document URLs: KYC files live in a private bucket
/// and are never exposed through a user-facing API.
class DeletionRequest {
  final String id;
  final String role;
  final DeletionRequestStatus status;
  final DateTime requestedAt;
  final DateTime graceEndsAt;
  final String requestedVia;
  final DateTime? reviewedAt;
  final String? adminNote;

  /// Why the request is on hold (surfaced verbatim in the UI).
  final String? holdReason;

  final bool canCancel;
  final int daysUntilReview;

  const DeletionRequest({
    required this.id,
    required this.role,
    required this.status,
    required this.requestedAt,
    required this.graceEndsAt,
    required this.requestedVia,
    this.reviewedAt,
    this.adminNote,
    this.holdReason,
    this.canCancel = false,
    this.daysUntilReview = 0,
  });

  factory DeletionRequest.fromJson(Map<String, dynamic> json) {
    final status = DeletionRequestStatus.fromWire(json['status']);
    return DeletionRequest(
      id: Json.asString(json['id']),
      role: Json.asString(json['role'], fallback: 'rider'),
      status: status,
      requestedAt:
          Json.asDateTimeOrNull(json['requested_at']) ?? DateTime.now(),
      graceEndsAt: Json.asDateTimeOrNull(json['grace_ends_at']) ??
          DateTime.now(),
      requestedVia: Json.asString(json['requested_via'], fallback: 'app'),
      reviewedAt: Json.asDateTimeOrNull(json['reviewed_at']),
      adminNote: Json.asStringOrNull(json['admin_note']),
      holdReason: Json.asStringOrNull(json['hold_reason']),
      // Trust the server first; fall back to the local rule so a response
      // without the flag still behaves correctly.
      canCancel: json['can_cancel'] is bool
          ? json['can_cancel'] as bool
          : status.canBeCancelled,
      daysUntilReview:
          Json.asInt(json['days_until_review'], fallback: 0),
    );
  }

  /// Friendly date for the request itself.
  String get requestedDateLabel => _dateLabel(requestedAt);

  /// Friendly date for the grace deadline, e.g. "16 Oct 2026".
  String get graceEndsLabel => _dateLabel(graceEndsAt);

  /// Friendly date for `reviewed_at`, null when nothing was reviewed yet.
  String? get reviewedLabel => reviewedAt == null ? null : _dateLabel(reviewedAt!);

  static String _dateLabel(DateTime value) {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    final local = value.toLocal();
    return '${local.day} ${months[local.month - 1]} ${local.year}';
  }
}

/// Response of `DELETE /users/me` (rider) and
/// `POST /users/me/deletion-request/cancel`: a user-facing message plus the
/// request itself, so the UI can show the server's own wording.
class DeletionRequestAction {
  final String message;
  final DeletionRequest request;

  const DeletionRequestAction({required this.message, required this.request});

  factory DeletionRequestAction.fromJson(Map<String, dynamic> json) {
    final request = Json.asMapOrNull(json['request']);
    if (request == null) {
      throw const FormatException('deletion response is missing the request');
    }
    return DeletionRequestAction(
      message: Json.asString(
        json['message'],
        fallback: 'Your deletion request has been updated.',
      ),
      request: DeletionRequest.fromJson(request),
    );
  }
}
