// GENERATED FILE — DO NOT EDIT.
// Source: design-tokens/tokens.json (v1.0.0).
// Regenerate: node design-tokens/generate-dart.mjs
// ignore_for_file: constant_identifier_names

import 'package:flutter/material.dart';

/// SpeedyMeals color tokens. Same values as the website's CSS variables.
abstract final class AppColors {
  /// Error / CTA tint background
  static const Color red50 = Color(0xFFFDF0EE);
  static const Color red100 = Color(0xFFFBE1DE);
  static const Color red200 = Color(0xFFF5C2BC);
  static const Color red300 = Color(0xFFEE9A91);
  static const Color red400 = Color(0xFFE86A5F);
  /// Brand red. Logo, icons, large display (>=24px bold), selection, live dot. NOT a fill behind small white text (4.30:1).
  static const Color red500 = Color(0xFFE23A2E);
  /// CTA fill (white text 5.36:1), red text on light, error
  static const Color red600 = Color(0xFFC92F24);
  /// CTA hover / pressed (7.16:1)
  static const Color red700 = Color(0xFFA8241B);
  static const Color red800 = Color(0xFF861D16);
  static const Color red900 = Color(0xFF651611);
  static const Color red950 = Color(0xFF3F0D0A);
  /// Red text on ink surfaces (6.43:1)
  static const Color redOnDark = Color(0xFFFF6B5E);
  /// Info tint background
  static const Color blue50 = Color(0xFFEAF1FA);
  static const Color blue100 = Color(0xFFD5E3F4);
  static const Color blue200 = Color(0xFFABC6E8);
  static const Color blue300 = Color(0xFF7EA6D9);
  static const Color blue400 = Color(0xFF4F84C6);
  static const Color blue500 = Color(0xFF2F6FB8);
  /// Trust: links, info, verified, tracking, focus ring (6.45:1 on white)
  static const Color blue600 = Color(0xFF1E5FA8);
  /// Link hover
  static const Color blue700 = Color(0xFF174C88);
  static const Color blue800 = Color(0xFF123B6A);
  static const Color blue900 = Color(0xFF0D2B4D);
  /// Blue on ink surfaces (6.65:1)
  static const Color blueOnDark = Color(0xFF6FA0E0);
  /// Premium tint, max one region per screen
  static const Color tan100 = Color(0xFFF3E8D0);
  /// Decorative only: rules, icon fills, badges on ink (never text on light: 2.26:1)
  static const Color tan400 = Color(0xFFC7A874);
  /// Tan text on light (5.01:1)
  static const Color tan700 = Color(0xFF8A6A32);
  /// Canvas / subtle fill (paper-off)
  static const Color ink50 = Color(0xFFF6F5F3);
  /// Skeleton, disabled fill, hover fill
  static const Color ink100 = Color(0xFFEFEEEB);
  /// Hairline divider / card border (line)
  static const Color ink200 = Color(0xFFE4E2DD);
  /// Strong divider, secondary-button border
  static const Color ink300 = Color(0xFFCFCCC6);
  /// Disabled text, decorative icons. Not for meaningful text on light.
  static const Color ink400 = Color(0xFFA0A4AB);
  /// Placeholder on white only (4.83:1)
  static const Color ink500 = Color(0xFF6E727A);
  /// Secondary / meta text (6.42:1 white, 5.89:1 ink-50)
  static const Color ink600 = Color(0xFF5B5F66);
  /// Strong secondary text, labels
  static const Color ink700 = Color(0xFF373C46);
  /// Raised surface on dark
  static const Color ink800 = Color(0xFF25282F);
  /// Dark section surface
  static const Color ink850 = Color(0xFF1A1D23);
  /// Primary text; inverse surface
  static const Color ink900 = Color(0xFF15171A);
  static const Color ink950 = Color(0xFF0D0E10);
  static const Color green50 = Color(0xFFE8F5EE);
  static const Color green100 = Color(0xFFD1EBDD);
  static const Color green200 = Color(0xFFA8D8BE);
  static const Color green300 = Color(0xFF74BF98);
  static const Color green400 = Color(0xFF3FA172);
  static const Color green500 = Color(0xFF16905F);
  static const Color green600 = Color(0xFF0E7A50);
  static const Color green700 = Color(0xFF0B6542);
  static const Color green800 = Color(0xFF094F34);
  static const Color green900 = Color(0xFF073B27);
  static const Color amber50 = Color(0xFFFDF4E3);
  static const Color amber100 = Color(0xFFFBE8C4);
  static const Color amber200 = Color(0xFFF6D08A);
  static const Color amber300 = Color(0xFFF0B550);
  static const Color amber400 = Color(0xFFF5A623);
  static const Color amber500 = Color(0xFFF59E0B);
  static const Color amber600 = Color(0xFFC27803);
  static const Color amber700 = Color(0xFF9A5B00);
  static const Color amber800 = Color(0xFF7A4800);
  static const Color amber900 = Color(0xFF5C3600);
  static const Color paper = Color(0xFFFFFFFF);
  static const Color borderControl = Color(0xFF8C877E);
  /// #0E7A50 — 5.36:1 on white; white text on it OK
  static const Color success = Color(0xFF0E7A50);
  static const Color successBg = Color(0xFFE8F5EE);
  /// #9A5B00 — 5.43:1 on white
  static const Color warning = Color(0xFF9A5B00);
  static const Color warningBg = Color(0xFFFDF4E3);
  /// Star icon fill only (ink text on it 8.36:1)
  static const Color rating = Color(0xFFF59E0B);
  static const Color error = Color(0xFFC92F24);
  static const Color errorBg = Color(0xFFFDF0EE);
  static const Color info = Color(0xFF1E5FA8);
  static const Color infoBg = Color(0xFFEAF1FA);
  static const Color background = Color(0xFFFFFFFF);
  static const Color canvas = Color(0xFFF6F5F3);
  static const Color surface = Color(0xFFFFFFFF);
  static const Color surfaceInverse = Color(0xFF15171A);
  static const Color text = Color(0xFF15171A);
  static const Color textSecondary = Color(0xFF5B5F66);
  static const Color textDisabled = Color(0xFFA0A4AB);
  static const Color textInverse = Color(0xFFFFFFFF);
  /// 11.59:1 on ink-900
  static const Color textInverseSecondary = Color(0xFFCBD0D8);
  static const Color line = Color(0xFFE4E2DD);
  static const Color cta = Color(0xFFC92F24);
  static const Color ctaHover = Color(0xFFA8241B);
  static const Color onCta = Color(0xFFFFFFFF);
  static const Color link = Color(0xFF1E5FA8);
  static const Color focus = Color(0xFF1E5FA8);
}

/// Sharp radius policy: nothing between 8px and pill.
abstract final class AppRadius {
  static const double none = 0;
  static const double xs = 2;
  static const double sm = 4;
  static const double md = 6;
  static const double lg = 8;
  static const double full = 9999;
}

/// 4px spacing scale + layout constants.
abstract final class AppSpacing {
  static const double s0 = 0;
  static const double s1 = 4;
  static const double s2 = 8;
  static const double s3 = 12;
  static const double s4 = 16;
  static const double s5 = 20;
  static const double s6 = 24;
  static const double s8 = 32;
  static const double s10 = 40;
  static const double s12 = 48;
  static const double s16 = 64;
  static const double s20 = 80;
  static const double sHalf = 2;
  static const double screenEdgeMobile = 16;
  static const double gutterWebSm = 16;
  static const double gutterWebMd = 24;
  static const double gutterWebLg = 32;
  static const double cardPadding = 16;
  static const double cardPaddingCompact = 12;
  static const double cardGap = 12;
  static const double sectionGapMobile = 24;
  static const double sectionGapWeb = 64;
  static const double bottomNavClearance = 88;
}

abstract final class AppSizes {
  static const double touchMin = 44;
  static const double controlSm = 32;
  static const double controlMd = 40;
  static const double controlLg = 48;
  static const double iconSm = 16;
  static const double iconMd = 20;
  static const double iconLg = 24;
  static const double focusRing = 2;
  static const double focusOffset = 2;
}

/// Elevation: borders carry structure, shadows only signal lift.
abstract final class AppShadows {
  static const List<BoxShadow> level0 = <BoxShadow>[];
  static const List<BoxShadow> level1 = <BoxShadow>[BoxShadow(color: Color(0x0F15171A), offset: Offset(0, 1), blurRadius: 2, spreadRadius: 0)];
  static const List<BoxShadow> level2 = <BoxShadow>[BoxShadow(color: Color(0x1A15171A), offset: Offset(0, 4), blurRadius: 12, spreadRadius: -2)];
  static const List<BoxShadow> level3 = <BoxShadow>[BoxShadow(color: Color(0x2E15171A), offset: Offset(0, 12), blurRadius: 32, spreadRadius: -8)];
}

abstract final class AppFonts {
  static const String sans = 'Figtree';
  static const String display = 'Archivo Black';
  static const String mono = 'JetBrains Mono';
}

/// Type scale. letterSpacing is in logical pixels (em × fontSize).
abstract final class AppTypography {
  static const TextStyle displayXl = TextStyle(fontFamily: 'Archivo Black', fontSize: 56, fontWeight: FontWeight.w400, height: 0.95, letterSpacing: -1.96);
  static const TextStyle displayLg = TextStyle(fontFamily: 'Figtree', fontSize: 32, fontWeight: FontWeight.w800, height: 1.25, letterSpacing: -0.64);
  static const TextStyle displayMd = TextStyle(fontFamily: 'Figtree', fontSize: 26, fontWeight: FontWeight.w700, height: 1.3, letterSpacing: -0.39);
  static const TextStyle headlineLg = TextStyle(fontFamily: 'Figtree', fontSize: 22, fontWeight: FontWeight.w700, height: 1.27, letterSpacing: -0.22);
  static const TextStyle headlineMd = TextStyle(fontFamily: 'Figtree', fontSize: 18, fontWeight: FontWeight.w600, height: 1.33, letterSpacing: -0.09);
  static const TextStyle headlineSm = TextStyle(fontFamily: 'Figtree', fontSize: 16, fontWeight: FontWeight.w600, height: 1.375, letterSpacing: 0);
  static const TextStyle bodyLg = TextStyle(fontFamily: 'Figtree', fontSize: 16, fontWeight: FontWeight.w400, height: 1.5, letterSpacing: 0);
  static const TextStyle bodyMd = TextStyle(fontFamily: 'Figtree', fontSize: 14, fontWeight: FontWeight.w400, height: 1.43, letterSpacing: 0);
  static const TextStyle bodySm = TextStyle(fontFamily: 'Figtree', fontSize: 12, fontWeight: FontWeight.w400, height: 1.33, letterSpacing: 0.12);
  static const TextStyle labelLg = TextStyle(fontFamily: 'Figtree', fontSize: 14, fontWeight: FontWeight.w600, height: 1.43, letterSpacing: 0.14);
  static const TextStyle labelMd = TextStyle(fontFamily: 'Figtree', fontSize: 12, fontWeight: FontWeight.w600, height: 1.33, letterSpacing: 0.24);
  static const TextStyle labelSm = TextStyle(fontFamily: 'Figtree', fontSize: 11, fontWeight: FontWeight.w700, height: 1.27, letterSpacing: 0.33);
  static const TextStyle eyebrow = TextStyle(fontFamily: 'JetBrains Mono', fontSize: 11, fontWeight: FontWeight.w500, height: 1.27, letterSpacing: 0.66);
  static const TextStyle price = TextStyle(fontFamily: 'Figtree', fontSize: 18, fontWeight: FontWeight.w800, height: 1.22, letterSpacing: -0.18);
}

abstract final class AppMotion {
  static const double pressScale = 0.97;
  static const Duration instant = Duration(milliseconds: 80);
  static const Duration fast = Duration(milliseconds: 120);
  static const Duration base = Duration(milliseconds: 200);
  static const Duration slow = Duration(milliseconds: 300);
  static const Curve standard = Cubic(0.2, 0, 0, 1);
}
