import '../../core/network/api_client.dart';
import '../json_utils.dart';
import '../models/deletion_models.dart';
import '../models/rider_models.dart';

/// Everything a signed-in rider can do.
///
/// All of these routes require the `rider` role. `approval_status` is enforced
/// server-side on the assignment and delivery-status endpoints, so an unapproved
/// rider receives 403 even though these calls are reachable.
class RiderRepository {
  RiderRepository({ApiClient? client}) : _client = client ?? ApiClient.instance;

  final ApiClient _client;

  /// `GET /wallet/profile` + `GET /wallet/balance`
  ///
  /// Added alongside this integration: the audit found no way for a rider client
  /// to read its own `approval_status` (`GET /auth/me` returns only id + role),
  /// which left the app unable to explain why work was being refused.
  ///
  /// The second read exists because `/wallet/profile` carries no COD-cash key:
  /// `pending_cash_owed` (cash collected on COD deliveries and not yet
  /// deposited) is only on `GET /wallet/balance` / `/wallet/cod-eligibility`,
  /// so both responses are fetched together and merged into one profile.
  Future<RiderProfile> profile() async {
    final results = await Future.wait([
      _client.getJson('/wallet/profile'),
      _client.getJson('/wallet/balance'),
    ]);
    return RiderProfile.fromJson(
      results[0],
      pendingCashOwed: Json.asDouble(results[1]['pending_cash_owed']),
    );
  }

  /// `GET /wallet/assignments`
  ///
  /// The backend returns an object `{active: [...], past: [...]}`, not a list:
  /// `active` are still-in-flight jobs, `past` are completed (Delivered) ones.
  Future<RiderAssignments> assignments() async {
    final json = await _client.getJson('/wallet/assignments');
    return RiderAssignments.fromJson(json);
  }

  /// `POST /wallet/assignments/{order_id}/respond`
  ///
  /// Only the assigned rider may respond, and only while the order is
  /// `Rider Assigned`. Rejecting re-assigns the order to the next nearest
  /// eligible rider, never back to the same one.
  Future<RiderAssignment> respondToAssignment({
    required String orderId,
    required bool accept,
  }) async {
    final json = await _client.postJson(
      '/wallet/assignments/$orderId/respond',
      body: {'action': accept ? 'accept' : 'reject'},
    );
    return RiderAssignment.fromJson(json);
  }

  /// `PATCH /wallet/deliveries/{order_id}/status/{arrived|picked-up|on-the-way|delivered}`
  ///
  /// One allowed transition per call. Reaching `Delivered` also settles the
  /// delivery on the server: the platform takes a 10% commission on the
  /// delivery fee (`DELIVERY_COMMISSION_RATE`) — debited from the rider's wallet
  /// for COD, while for digital orders the rider's 90% share
  /// (`RIDER_DELIVERY_SHARE`) is credited. For COD orders the order total is
  /// added to `pending_cash_owed`.
  Future<RiderAssignment> advanceDeliveryStatus({
    required String orderId,
    required RiderAction action,
  }) async {
    final json = await _client.patchJson(
      '/wallet/deliveries/$orderId/status/${action.endpointSegment}',
    );
    return RiderAssignment.fromJson(json);
  }

  /// `GET /wallet/earnings` — the full three-number view (earnings, wallet,
  /// cash owed).
  Future<RiderWallet> earnings() async {
    final json = await _client.getJson('/wallet/earnings');
    return RiderWallet.fromJson(json);
  }

  /// `PATCH /wallet/status`
  ///
  /// Going online requires kit completion and kit deposit; no wallet minimum.
  /// Going offline is always allowed.
  Future<RiderWallet> setOnline(bool isOnline) async {
    final json = await _client.patchJson(
      '/wallet/status',
      body: {'is_online': isOnline},
    );
    return RiderWallet.fromJson(json);
  }

  /// `GET /wallet/cod-eligibility` — whether the rider may take more cash work.
  Future<CODEligibility> codEligibility() async {
    final json = await _client.getJson('/wallet/cod-eligibility');
    return CODEligibility.fromJson(json);
  }

  /// `PATCH /wallet/location`
  ///
  /// Required for automatic assignment: the backend stores the position in Redis
  /// with a ~45s TTL and treats an expired location as "not available". The
  /// rider's own id comes from the token, never from the body.
  Future<void> updateLocation({
    required double latitude,
    required double longitude,
  }) async {
    await _client.patchJson(
      '/wallet/location',
      body: {'latitude': latitude, 'longitude': longitude},
    );
  }

  /// `POST /wallet/recharge` — manual top-up (no real gateway in the MVP).
  /// `method` must be one of `bank_transfer | jazzcash | easypaisa | card`.
  Future<void> recharge({required double amount, required String method}) async {
    await _client.postJson(
      '/wallet/recharge',
      body: {'amount': amount, 'method': method},
    );
  }

  /// `POST /wallet/cash-deposit` — submit collected COD cash.
  /// `submissionMethod` must be one of `bank_transfer | mobile_wallet | hub`.
  /// The expected amount and any discrepancy are computed server-side.
  Future<void> submitCashDeposit({
    required double amountSubmitted,
    required String submissionMethod,
  }) async {
    await _client.postJson(
      '/wallet/cash-deposit',
      body: {
        'amount_submitted': amountSubmitted,
        'submission_method': submissionMethod,
      },
    );
  }

  /// `POST /wallet/documents/{doc_type}` where doc_type is
  /// `cnic | license | vehicle`. JPG/PNG only, 5 MB max.
  Future<RiderProfile> uploadDocument({
    required String docType,
    required List<int> bytes,
    required String filename,
    required String contentType,
  }) async {
    await _client.uploadFile(
      '/wallet/documents/$docType',
      bytes: bytes,
      filename: filename,
      contentType: contentType,
    );
    // The upload response carries only the three photo URLs, so the profile is
    // re-read to hand the caller one complete, authoritative object.
    return profile();
  }

  // -------------------------------------------------------- account deletion

  /// `DELETE /users/me` (rider) — start the deferred deletion request.
  ///
  /// The backend deactivates the account immediately, takes the rider offline
  /// and returns the new request together with its `grace_ends_at`. It answers
  /// 409 while an active delivery exists — the message is surfaced verbatim.
  ///
  /// Nothing is deleted here: the data is removed only after an admin approves
  /// the request (7-day grace, then review) and only when the rider has no
  /// pending dues.
  Future<DeletionRequestAction> requestAccountDeletion() async {
    final json = await _client.deleteJson('/users/me');
    return DeletionRequestAction.fromJson(json);
  }

  /// `GET /users/me/deletion-request` — the rider's current request, or null
  /// when there is none.
  ///
  /// The endpoint is deliberately not an error when empty (the status screen
  /// asks this on every open), so `request: null` maps to null here.
  Future<DeletionRequest?> deletionRequest() async {
    final json = await _client.getJson('/users/me/deletion-request');
    final request = Json.asMapOrNull(json['request']);
    return request == null ? null : DeletionRequest.fromJson(request);
  }

  /// `POST /users/me/deletion-request/cancel` — allowed while the request is
  /// `pending` or `ready_for_review`; the backend reactivates the account.
  ///
  /// 409 once an admin has already approved (or put it on hold) — the rider
  /// must then contact support instead.
  Future<DeletionRequestAction> cancelDeletionRequest() async {
    final json = await _client.postJson('/users/me/deletion-request/cancel');
    return DeletionRequestAction.fromJson(json);
  }
}
