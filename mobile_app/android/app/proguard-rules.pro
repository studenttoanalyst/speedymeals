# R8 / ProGuard keep rules for the release build (minify + resource shrink).
#
# The Flutter Gradle plugin automatically adds its own rules
# (flutter_proguard_rules.pro) plus the default
# `proguard-android-optimize.txt`; this file holds the rules specific to the
# plugins this app uses. Everything here is either a reflective/JNI entry point
# or a class the Flutter side references by name — do not broaden these into
# `-keep class com.example.app.** { *; }` blanket rules.

# ── Firebase (firebase_core / firebase_messaging) ──────────────────────────
# Firebase registers components and JNI entry points reflectively.
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**

# ── flutter_local_notifications ─────────────────────────────────────────────
# Notification scheduling/presentation reaches the plugin via a BroadcastReceiver
# name string; core library desugaring is enabled separately in build.gradle.kts.
-keep class com.dexterous.flutterlocalnotifications.** { *; }
-dontwarn com.dexterous.flutterlocalnotifications.**

# ── flutter_secure_storage ──────────────────────────────────────────────────
# Uses Android Keystore + EncryptedSharedPreferences and the plugin's Java
# handlers.
-keep class com.it_nomads.fluttersecurestorage.** { *; }
-dontwarn com.it_nomads.fluttersecurestorage.**

# ── geolocator (foreground location service) ────────────────────────────────
# The service is referenced from the merged manifest and the plugin is loaded
# through GeneratedPluginRegistrant.
-keep class com.baseflow.geolocator.** { *; }
-dontwarn com.baseflow.geolocator.**

# ── google_maps_flutter ─────────────────────────────────────────────────────
-keep class com.google.android.gms.maps.** { *; }
-dontwarn com.google.android.gms.maps.**

# ── url_launcher ────────────────────────────────────────────────────────────
-keep class io.flutter.plugins.urllauncher.** { *; }
-dontwarn io.flutter.plugins.urllauncher.**

# ── file_picker (rider KYC upload) ──────────────────────────────────────────
-keep class com.mr.flutter.plugin.filepicker.** { *; }
-dontwarn com.mr.flutter.plugin.filepicker.**

# ── Google Play services (Maps / FCM transitive) ────────────────────────────
-dontwarn com.google.android.gms.**
-dontwarn javax.annotation.**

# ── JSON / Kotlin ───────────────────────────────────────────────────────────
# Models are reached through Dart-side `fromJson` and Dart's MethodChannel —
# keep generic signatures so kotlinx/Gson-style reflection stays safe if a
# dependency introduces them.
-keepattributes Signature, InnerClasses, EnclosingMethod, *Annotation*
-dontwarn kotlin.**
-dontwarn kotlinx.**
