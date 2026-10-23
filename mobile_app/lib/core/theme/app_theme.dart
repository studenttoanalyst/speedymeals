import 'package:flutter/material.dart';

import '../../constants/colors.dart';
import 'app_tokens.dart';

/// SpeedyMeals Material 3 theme, assembled from the shared design tokens
/// (design-tokens/tokens.json → app_tokens.dart). Component specs follow
/// docs/DESIGN_TOKENS.md §8: sharp radii, borders over shadows, red CTA,
/// blue focus, 48px touch controls.
class AppTheme {
  AppTheme._();

  static const _shapeSm = RoundedRectangleBorder(borderRadius: BorderRadius.all(Radius.circular(AppRadius.sm)));
  static const _shapeMd = RoundedRectangleBorder(borderRadius: BorderRadius.all(Radius.circular(AppRadius.md)));
  static const _shapeLg = RoundedRectangleBorder(borderRadius: BorderRadius.all(Radius.circular(AppRadius.lg)));
  static const _controlSize = Size(64, AppSizes.controlLg);
  static const _buttonPadding = EdgeInsets.symmetric(horizontal: AppSpacing.s5, vertical: AppSpacing.s3);

  static OutlineInputBorder _inputBorder(Color color, [double width = 1]) => OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppRadius.sm),
        borderSide: BorderSide(color: color, width: width),
      );

  static ThemeData get light {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      fontFamily: AppFonts.sans,
      colorScheme: const ColorScheme.light(
        primary: SpeedyMealsColors.primary,
        onPrimary: SpeedyMealsColors.onPrimary,
        primaryContainer: SpeedyMealsColors.primaryContainer,
        onPrimaryContainer: SpeedyMealsColors.onPrimaryContainer,
        secondary: SpeedyMealsColors.secondary,
        onSecondary: SpeedyMealsColors.onSecondary,
        secondaryContainer: SpeedyMealsColors.secondaryContainer,
        onSecondaryContainer: SpeedyMealsColors.onSecondaryContainer,
        tertiary: SpeedyMealsColors.tertiary,
        onTertiary: SpeedyMealsColors.onTertiary,
        tertiaryContainer: SpeedyMealsColors.tertiaryContainer,
        onTertiaryContainer: SpeedyMealsColors.onTertiaryContainer,
        surface: SpeedyMealsColors.surface,
        onSurface: SpeedyMealsColors.onSurface,
        onSurfaceVariant: SpeedyMealsColors.onSurfaceVariant,
        surfaceContainerLowest: SpeedyMealsColors.surfaceContainerLowest,
        surfaceContainerLow: SpeedyMealsColors.surfaceContainerLow,
        surfaceContainer: SpeedyMealsColors.surfaceContainer,
        surfaceContainerHigh: SpeedyMealsColors.surfaceContainerHigh,
        surfaceContainerHighest: SpeedyMealsColors.surfaceContainerHighest,
        surfaceTint: SpeedyMealsColors.surfaceTint,
        outline: SpeedyMealsColors.outline,
        outlineVariant: SpeedyMealsColors.outlineVariant,
        inverseSurface: SpeedyMealsColors.inverseSurface,
        onInverseSurface: SpeedyMealsColors.inverseOnSurface,
        inversePrimary: AppColors.redOnDark,
        error: SpeedyMealsColors.error,
        onError: SpeedyMealsColors.onError,
        errorContainer: SpeedyMealsColors.errorContainer,
        onErrorContainer: SpeedyMealsColors.onErrorContainer,
        shadow: AppColors.ink900,
        scrim: AppColors.ink900,
      ),
      scaffoldBackgroundColor: AppColors.canvas,
      textTheme: _textTheme,
      iconTheme: const IconThemeData(color: AppColors.textSecondary, size: AppSizes.iconLg),
      dividerTheme: const DividerThemeData(color: AppColors.line, thickness: 1, space: 1),
      splashFactory: InkSparkle.splashFactory,

      appBarTheme: AppBarTheme(
        backgroundColor: Colors.transparent,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        titleTextStyle: AppTypography.headlineMd.copyWith(color: AppColors.text),
        iconTheme: const IconThemeData(color: AppColors.text),
      ),

      // Cards: white on canvas, hairline border, no shadow (structure via borders).
      cardTheme: const CardThemeData(
        color: AppColors.surface,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(AppRadius.md)),
          side: BorderSide(color: AppColors.line),
        ),
      ),

      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.surface,
        contentPadding: const EdgeInsets.symmetric(horizontal: AppSpacing.s4, vertical: 14),
        hintStyle: AppTypography.bodyLg.copyWith(color: AppColors.ink500),
        labelStyle: AppTypography.labelMd.copyWith(color: AppColors.ink700),
        floatingLabelStyle: AppTypography.labelMd.copyWith(color: AppColors.focus),
        helperStyle: AppTypography.bodySm.copyWith(color: AppColors.textSecondary),
        errorStyle: AppTypography.bodySm.copyWith(color: AppColors.error),
        prefixIconColor: AppColors.ink500,
        suffixIconColor: AppColors.ink500,
        border: _inputBorder(AppColors.borderControl),
        enabledBorder: _inputBorder(AppColors.borderControl),
        disabledBorder: _inputBorder(AppColors.line),
        focusedBorder: _inputBorder(AppColors.focus, 2),
        errorBorder: _inputBorder(AppColors.error),
        focusedErrorBorder: _inputBorder(AppColors.error, 2),
      ),

      // Primary: red CTA, one per screen.
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.cta,
          foregroundColor: AppColors.onCta,
          disabledBackgroundColor: AppColors.ink100,
          disabledForegroundColor: AppColors.textDisabled,
          elevation: 0,
          minimumSize: _controlSize,
          padding: _buttonPadding,
          shape: _shapeSm,
          textStyle: AppTypography.labelLg.copyWith(fontSize: 16),
        ).copyWith(
          overlayColor: const WidgetStatePropertyAll(Color(0x1FFFFFFF)),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: AppColors.cta,
          foregroundColor: AppColors.onCta,
          disabledBackgroundColor: AppColors.ink100,
          disabledForegroundColor: AppColors.textDisabled,
          minimumSize: _controlSize,
          padding: _buttonPadding,
          shape: _shapeSm,
          textStyle: AppTypography.labelLg.copyWith(fontSize: 16),
        ),
      ),
      // Secondary: white with ink border.
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.text,
          backgroundColor: AppColors.surface,
          side: const BorderSide(color: AppColors.ink300),
          minimumSize: _controlSize,
          padding: _buttonPadding,
          shape: _shapeSm,
          textStyle: AppTypography.labelLg.copyWith(fontSize: 16),
        ),
      ),
      // Text buttons are links: trust blue.
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: AppColors.link,
          minimumSize: const Size(0, AppSizes.touchMin),
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.s3, vertical: AppSpacing.s2),
          shape: _shapeSm,
          textStyle: AppTypography.labelLg,
        ),
      ),
      iconButtonTheme: IconButtonThemeData(
        style: IconButton.styleFrom(
          foregroundColor: AppColors.text,
          minimumSize: const Size(AppSizes.touchMin, AppSizes.touchMin),
          shape: _shapeSm,
        ),
      ),
      floatingActionButtonTheme: const FloatingActionButtonThemeData(
        backgroundColor: AppColors.cta,
        foregroundColor: AppColors.onCta,
        elevation: 2,
        focusElevation: 2,
        hoverElevation: 3,
        highlightElevation: 3,
        // One shape covers regular and extended FABs; extended FABs carry a
        // label, so they take the button radius (a circle clips the text).
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.all(Radius.circular(AppRadius.sm))),
        extendedPadding: EdgeInsets.symmetric(horizontal: AppSpacing.s5),
        extendedTextStyle: AppTypography.labelLg,
      ),

      chipTheme: ChipThemeData(
        backgroundColor: AppColors.ink100,
        selectedColor: AppColors.ink900,
        disabledColor: AppColors.ink50,
        side: BorderSide.none,
        shape: _shapeSm,
        labelStyle: AppTypography.labelMd.copyWith(color: AppColors.ink700),
        secondaryLabelStyle: AppTypography.labelMd.copyWith(color: AppColors.paper),
        checkmarkColor: AppColors.paper,
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.s3, vertical: AppSpacing.s2),
      ),

      checkboxTheme: CheckboxThemeData(
        shape: const RoundedRectangleBorder(borderRadius: BorderRadius.all(Radius.circular(AppRadius.xs))),
        side: const BorderSide(color: AppColors.borderControl, width: 1.5),
        fillColor: WidgetStateProperty.resolveWith(
          (states) => states.contains(WidgetState.selected) ? AppColors.cta : Colors.transparent,
        ),
        checkColor: const WidgetStatePropertyAll(AppColors.onCta),
      ),
      radioTheme: RadioThemeData(
        fillColor: WidgetStateProperty.resolveWith(
          (states) => states.contains(WidgetState.selected) ? AppColors.cta : AppColors.borderControl,
        ),
      ),
      switchTheme: SwitchThemeData(
        thumbColor: const WidgetStatePropertyAll(AppColors.paper),
        trackColor: WidgetStateProperty.resolveWith(
          (states) => states.contains(WidgetState.selected) ? AppColors.cta : AppColors.ink300,
        ),
        trackOutlineColor: const WidgetStatePropertyAll(Colors.transparent),
      ),
      progressIndicatorTheme: const ProgressIndicatorThemeData(
        color: AppColors.cta,
        linearTrackColor: AppColors.ink100,
        circularTrackColor: AppColors.ink100,
      ),

      dialogTheme: DialogThemeData(
        backgroundColor: AppColors.surface,
        surfaceTintColor: Colors.transparent,
        elevation: 3,
        shadowColor: AppColors.ink900,
        shape: _shapeLg,
        titleTextStyle: AppTypography.headlineMd.copyWith(color: AppColors.text),
        contentTextStyle: AppTypography.bodyMd.copyWith(color: AppColors.textSecondary),
      ),
      bottomSheetTheme: const BottomSheetThemeData(
        backgroundColor: AppColors.surface,
        surfaceTintColor: Colors.transparent,
        modalBackgroundColor: AppColors.surface,
        elevation: 3,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(AppRadius.lg)),
        ),
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: AppColors.surfaceInverse,
        contentTextStyle: AppTypography.bodyMd.copyWith(color: AppColors.textInverse),
        actionTextColor: AppColors.blueOnDark,
        behavior: SnackBarBehavior.floating,
        shape: _shapeSm,
      ),
      popupMenuTheme: PopupMenuThemeData(
        color: AppColors.surface,
        surfaceTintColor: Colors.transparent,
        elevation: 2,
        shape: _shapeMd,
        textStyle: AppTypography.bodyMd.copyWith(color: AppColors.text),
      ),
      tabBarTheme: TabBarThemeData(
        labelColor: AppColors.text,
        unselectedLabelColor: AppColors.ink500,
        indicatorColor: AppColors.cta,
        dividerColor: AppColors.line,
        labelStyle: AppTypography.labelLg,
        unselectedLabelStyle: AppTypography.labelLg,
      ),
      listTileTheme: const ListTileThemeData(
        iconColor: AppColors.textSecondary,
        textColor: AppColors.text,
      ),

      bottomNavigationBarTheme: BottomNavigationBarThemeData(
        backgroundColor: AppColors.surface,
        elevation: 0,
        selectedItemColor: AppColors.cta,
        unselectedItemColor: AppColors.ink500,
        selectedLabelStyle: AppTypography.labelSm,
        unselectedLabelStyle: AppTypography.labelSm,
        type: BottomNavigationBarType.fixed,
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: AppColors.surface,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        indicatorColor: AppColors.red50,
        indicatorShape: _shapeSm,
        iconTheme: WidgetStateProperty.resolveWith(
          (states) => IconThemeData(
            color: states.contains(WidgetState.selected) ? AppColors.cta : AppColors.ink500,
          ),
        ),
        labelTextStyle: WidgetStateProperty.resolveWith(
          (states) => AppTypography.labelSm.copyWith(
            color: states.contains(WidgetState.selected) ? AppColors.text : AppColors.ink500,
          ),
        ),
      ),
    );
  }

  static TextTheme get _textTheme {
    const ink = AppColors.text;
    return TextTheme(
      displayLarge: AppTypography.displayLg.copyWith(color: ink),
      displayMedium: AppTypography.displayMd.copyWith(color: ink),
      displaySmall: AppTypography.headlineLg.copyWith(color: ink),
      headlineLarge: AppTypography.headlineLg.copyWith(color: ink),
      headlineMedium: AppTypography.headlineMd.copyWith(color: ink),
      headlineSmall: AppTypography.headlineSm.copyWith(color: ink),
      titleLarge: AppTypography.headlineMd.copyWith(color: ink),
      titleMedium: AppTypography.headlineSm.copyWith(color: ink),
      titleSmall: AppTypography.labelLg.copyWith(color: ink),
      bodyLarge: AppTypography.bodyLg.copyWith(color: ink),
      bodyMedium: AppTypography.bodyMd.copyWith(color: ink),
      bodySmall: AppTypography.bodySm.copyWith(color: AppColors.textSecondary),
      labelLarge: AppTypography.labelLg.copyWith(color: ink),
      labelMedium: AppTypography.labelMd.copyWith(color: ink),
      labelSmall: AppTypography.labelSm.copyWith(color: ink),
    );
  }
}
