import '../../core/network/api_client.dart';
import '../models/rider_models.dart';

/// Everything a signed-in rider can do.
///
/// All of these routes require the `rider` role. `approval_status` is enforced
/// server-side on the assignment and delivery-status endpoints, so an unapproved
/// rider receives 403 even though these calls are reachable.
class RiderRepository {
  RiderRepository({ApiClient? client}) : _client = client ?? ApiClient.instance;

  final ApiClient _client;

  /// `GET /wallet/profile`
  ///
  /// Added alongside this integration: the audit found no way for a rider client
  /// to read its own `approval_status` (`GET /auth/me` returns only id + role),
  /// which left the app unable to explain why work was being refused.
  Future<RiderProfile> profile() async {
    final json = await _client.getJson('/wallet/profile');
    return RiderProfile.fromJson(json);
  }

  /// `GET /wallet/assignments`
  ///
  /// Also added for this integration — the backend auto-assigns the nearest
  /// eligible rider and had no way for that rider to discover the job. Returns
  /// jobs needing a response first, then in-progress jobs, then recent
  /// deliveries.
  Future<List<RiderAssignment>> assignments() async {
    final list = await _client.getJsonList('/wallet/assignments');
    return list
        .whereType<Map>()
        .map((entry) => RiderAssignment.fromJson(Map<String, dynamic>.from(entry)))
        .toList(growable: false);
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
  /// delivery on the server: Rs. 10 is deducted from the rider's wallet and, for
  /// COD orders, the order total is added to `pending_cash_owed`.
  Future<RiderAssignment> advanceDeliveryStatus({
    required String orderId,
    required RiderAction action,
  }) async {
    final json = await _client.patchJson(
      '/wallet/deliveries/$orderId/status/${action.endpointSegment}',
    );
    return RiderAssignment.fromJson(json);
  }

  /// `GET /wallet/balance` — wallet balance, cash owed and online state.
  Future<RiderWallet> wallet() async {
    final json = await _client.getJson('/wallet/balance');
    return RiderWallet.fromJson(json);
  }

  /// `GET /wallet/earnings` — the full three-number view (earnings, wallet,
  /// cash owed).
  Future<RiderWallet> earnings() async {
    final json = await _client.getJson('/wallet/earnings');
    return RiderWallet.fromJson(json);
  }

  /// `PATCH /wallet/status`
  ///
  /// Going online is refused with 400 while the wallet is below Rs. 500; going
  /// offline is always allowed.
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
}
