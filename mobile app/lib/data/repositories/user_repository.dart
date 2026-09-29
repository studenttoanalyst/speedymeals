import '../../core/network/api_client.dart';
import '../models/user_models.dart';

/// Customer profile and saved-address calls.
///
/// Every endpoint here is customer-only on the backend (`require_role(["customer"])`),
/// so a rider token gets a 403 — the rider app must use
/// [RiderRepository.profile] instead.
class UserRepository {
  UserRepository({ApiClient? client}) : _client = client ?? ApiClient.instance;

  final ApiClient _client;

  /// `GET /users/me` — phone number is read-only, wallet balance is
  /// system-managed.
  Future<UserProfile> getProfile() async {
    final json = await _client.getJson('/users/me');
    return UserProfile.fromJson(json);
  }

  /// `PUT /users/me` — only `name` and `email` are editable.
  Future<UserProfile> updateProfile(UserProfileUpdate update) async {
    final json = await _client.putJson('/users/me', body: update.toJson());
    return UserProfile.fromJson(json);
  }

  /// `GET /users/me/addresses`
  Future<List<UserAddress>> listAddresses() async {
    final list = await _client.getJsonList('/users/me/addresses');
    return list
        .whereType<Map>()
        .map((entry) => UserAddress.fromJson(Map<String, dynamic>.from(entry)))
        .toList(growable: false);
  }

  /// `POST /users/me/addresses` — coordinates are required by the backend
  /// because restaurant browsing and delivery-fee calculation both depend on
  /// them. Setting `is_default: true` makes the backend clear the flag on the
  /// customer's other addresses.
  Future<UserAddress> createAddress({
    required double latitude,
    required double longitude,
    String? label,
    String? fullAddress,
    bool isDefault = false,
  }) async {
    final json = await _client.postJson(
      '/users/me/addresses',
      body: {
        'latitude': latitude,
        'longitude': longitude,
        'label': label,
        'full_address': fullAddress,
        'is_default': isDefault,
      },
    );
    return UserAddress.fromJson(json);
  }

  /// `PUT /users/me/addresses/{address_id}` — partial update.
  Future<UserAddress> updateAddress(
    String addressId, {
    double? latitude,
    double? longitude,
    String? label,
    String? fullAddress,
    bool? isDefault,
  }) async {
    // Fields left null are omitted entirely rather than sent as JSON null:
    // the backend's update schema is a partial update, where an absent key
    // means "leave unchanged" but an explicit null means "clear this value".
    final body = <String, dynamic>{};
    if (latitude != null) body['latitude'] = latitude;
    if (longitude != null) body['longitude'] = longitude;
    if (label != null) body['label'] = label;
    if (fullAddress != null) body['full_address'] = fullAddress;
    if (isDefault != null) body['is_default'] = isDefault;

    final json = await _client.putJson(
      '/users/me/addresses/$addressId',
      body: body,
    );
    return UserAddress.fromJson(json);
  }

  /// `DELETE /users/me/addresses/{address_id}` — 204 on success.
  Future<void> deleteAddress(String addressId) async {
    await _client.delete('/users/me/addresses/$addressId');
  }
}
