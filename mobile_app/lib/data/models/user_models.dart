import '../json_utils.dart';

/// Response of `GET /users/me` and `PUT /users/me`
/// (backend: `platform/users/schemas.py: UserProfileSchema`).
///
/// `phoneNumber` is read-only — it is the OTP-verified identity and is
/// deliberately absent from [UserProfileUpdate]. `walletBalance` is
/// system-managed and never customer-writable.
class UserProfile {
  final String id;
  final String phoneNumber;
  final String name;
  final String? email;
  final double walletBalance;
  final String countryCode;
  final bool isActive;

  const UserProfile({
    required this.id,
    required this.phoneNumber,
    required this.name,
    this.email,
    this.walletBalance = 0,
    this.countryCode = '+92',
    this.isActive = true,
  });

  factory UserProfile.fromJson(Map<String, dynamic> json) => UserProfile(
        id: Json.asString(json['id']),
        phoneNumber: Json.asString(json['phone_number']),
        name: Json.asString(json['name']),
        email: Json.asStringOrNull(json['email']),
        walletBalance: Json.asDouble(json['wallet_balance']),
        countryCode: Json.asString(json['country_code'], fallback: '+92'),
        isActive: Json.asBool(json['is_active'], fallback: true),
      );

  /// First name for greetings, falling back to the phone number so the UI never
  /// renders an empty heading.
  String get displayName {
    final trimmed = name.trim();
    if (trimmed.isNotEmpty) return trimmed.split(' ').first;
    if (phoneNumber.isNotEmpty) return phoneNumber;
    return 'there';
  }

  /// Phone number as the customer typed it, prefixed with the country code.
  String get fullPhoneNumber {
    if (phoneNumber.startsWith('+')) return phoneNumber;
    return '$countryCode$phoneNumber';
  }

  UserProfile copyWith({String? name, String? email}) => UserProfile(
        id: id,
        phoneNumber: phoneNumber,
        name: name ?? this.name,
        email: email ?? this.email,
        walletBalance: walletBalance,
        countryCode: countryCode,
        isActive: isActive,
      );
}

/// Body of `PUT /users/me` — only these two fields are editable
/// (backend: `UserProfileUpdateSchema`).
class UserProfileUpdate {
  final String? name;
  final String? email;

  const UserProfileUpdate({this.name, this.email});

  Map<String, dynamic> toJson() => {
        if (name != null) 'name': name,
        if (email != null) 'email': email,
      };
}

/// A saved delivery address (backend: `AddressResponseSchema`).
///
/// The backend requires real coordinates — restaurant browsing and delivery-fee
/// calculation both depend on them — so latitude/longitude are non-nullable here
/// even though the create schema technically allows any float.
class UserAddress {
  final String id;
  final String? label;
  final double latitude;
  final double longitude;
  final String? fullAddress;
  final bool isDefault;

  const UserAddress({
    required this.id,
    this.label,
    required this.latitude,
    required this.longitude,
    this.fullAddress,
    this.isDefault = false,
  });

  factory UserAddress.fromJson(Map<String, dynamic> json) => UserAddress(
        id: Json.asString(json['id']),
        label: Json.asStringOrNull(json['label']),
        latitude: Json.asDouble(json['latitude']),
        longitude: Json.asDouble(json['longitude']),
        fullAddress: Json.asStringOrNull(json['full_address']),
        isDefault: Json.asBool(json['is_default']),
      );

  /// What the UI shows as the primary line.
  String get displayTitle {
    final trimmedLabel = label?.trim();
    if (trimmedLabel != null && trimmedLabel.isNotEmpty) return trimmedLabel;
    final trimmedAddress = fullAddress?.trim();
    if (trimmedAddress != null && trimmedAddress.isNotEmpty) return trimmedAddress;
    return 'Saved address';
  }

  /// Secondary line (falls back to coordinates when no free-text address was
  /// entered, so the row is never blank).
  String get displaySubtitle {
    final trimmed = fullAddress?.trim();
    if (trimmed != null && trimmed.isNotEmpty) return trimmed;
    return '${latitude.toStringAsFixed(4)}, ${longitude.toStringAsFixed(4)}';
  }

  Map<String, dynamic> toCreateJson() => {
        'label': label,
        'latitude': latitude,
        'longitude': longitude,
        'full_address': fullAddress,
        'is_default': isDefault,
      };
}
