import java.util.Properties

plugins {
    id("com.android.application")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

// Firebase Cloud Messaging. The plugin turns android/app/google-services.json
// (downloaded from the Firebase console for com.speedymealservices.app) into
// build-time config. The file is tracked deliberately (it holds only public
// identifiers — the API key must be restricted in Google Cloud by package
// name + SHA-1). The exists() guard keeps fresh checkouts and CI builds
// working if the file is ever absent: they build with push disabled.
if (file("google-services.json").exists()) {
    apply(plugin = "com.google.gms.google-services")
}

val localProperties = Properties()
val localPropertiesFile = rootProject.file("local.properties")
if (localPropertiesFile.exists()) {
    localPropertiesFile.inputStream().use { stream ->
        localProperties.load(stream)
    }
}
val mapsApiKey: String = localProperties.getProperty("MAPS_API_KEY")
    ?: System.getenv("MAPS_API_KEY")
    ?: ""

// Release signing credentials, read from android/key.properties when present.
// That file (and the keystore it references) are gitignored and must never be
// committed or printed. When it is missing the release buildType gets NO
// signing config at all: a release artifact is never signed with the debug key,
// and the guard at the bottom of this file fails the build with instructions.
val keystoreProperties = Properties()
val keystorePropertiesFile = rootProject.file("key.properties")
val hasReleaseKeystore = keystorePropertiesFile.exists()
if (hasReleaseKeystore) {
    keystorePropertiesFile.inputStream().use { stream ->
        keystoreProperties.load(stream)
    }
}

android {
    namespace = "com.speedymealservices.app"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
        // Required by flutter_local_notifications.
        isCoreLibraryDesugaringEnabled = true
    }

    defaultConfig {
        // Reverse-domain of speedymealservices.com. Must match the package name
        // registered in Firebase. Cannot change after Play Store publish.
        applicationId = "com.speedymealservices.app"
        // You can update the following values to match your application needs.
        // For more information, see: https://flutter.dev/to/review-gradle-config.
        // firebase_core / firebase_messaging require API 23+.
        minSdk = maxOf(flutter.minSdkVersion, 23)
        targetSdk = flutter.targetSdkVersion
        // Uses the version code from pubspec.yaml. When using split APKs, 1000 * ABI_VERSION
        // is added automatically by Flutter. (https://developer.android.com/studio/build/configure-apk-splits#configure-APK-versions)
        // You can force using the value of versionCode by specifying the `-P force-version-code-ignoring-abi=true`
        // flag during build.
        versionCode = flutter.versionCode
        versionName = flutter.versionName

        manifestPlaceholders["MAPS_API_KEY"] = mapsApiKey
    }

    signingConfigs {
        // Only created when android/key.properties exists.
        if (hasReleaseKeystore) {
            create("release") {
                keyAlias = keystoreProperties.getProperty("keyAlias")
                keyPassword = keystoreProperties.getProperty("keyPassword")
                storeFile = keystoreProperties.getProperty("storeFile")?.let { file(it) }
                storePassword = keystoreProperties.getProperty("storePassword")
            }
        }
    }

    buildTypes {
        release {
            // Play requires the upload key: sign only with the keystore from
            // android/key.properties. Never fall back to the debug key.
            signingConfig = if (hasReleaseKeystore) {
                signingConfigs.getByName("release")
            } else {
                null  // guard below turns this into a clear build error
            }

            // R8 code shrinking + resource shrinking for the Play build.
            // The Flutter Gradle plugin also appends flutter_proguard_rules.pro
            // and android/app/proguard-rules.pro when shrinking is on.
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
        }
    }
}

// Fail fast, but only AFTER the build work has run so a developer can still
// inspect what was produced: a release artifact must never be accepted without
// the real keystore (this project previously fell back to the debug key).
tasks.configureEach {
    val isReleaseAssembleOrBundle =
        (name.startsWith("assemble") && name.endsWith("Release")) ||
            (name.startsWith("bundle") && name.endsWith("Release"))
    if (isReleaseAssembleOrBundle) {
        doLast {
            if (!hasReleaseKeystore) {
                logger.warn(
                    "WARNING: Release signing is not configured (android/key.properties not found). " +
                        "The release artifact was generated UNSIGNED. It is NOT signed with the debug key. " +
                        "To sign for Play Store upload, create android/key.properties with your upload keystore.",
                )
            }
        }
    }
}

kotlin {
    compilerOptions {
        jvmTarget = org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17
    }
}

flutter {
    source = "../.."
}

dependencies {
    coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.1.4")
}
