import 'package:flutter/material.dart';

class CivicPulseColors {
  // Base Atmospheres
  static const Color bgCanvas = Color(0xFF070A10);
  static const Color bgSurface = Color(0xFF0D131F);
  static const Color bgElevated = Color(0xFF151D2D);

  // Accent Neons & Primary Hues
  static const Color accentPrimary = Color(0xFF0A84FF);
  static const Color accentCyan = Color(0xFF64D2FF);
  static const Color accentSuccess = Color(0xFF30D158);
  static const Color accentWarning = Color(0xFFFF9F0A);
  static const Color accentDanger = Color(0xFFFF453A);
  static const Color accentPurple = Color(0xFFBF5AF2);

  // Typography Tokens
  static const Color textPrimary = Color(0xFFF9FAFB);
  static const Color textSecondary = Color(0xFF94A3B8);
  static const Color textTertiary = Color(0xFF64748B);

  // Liquid Glass Material Tiers
  static final Color glassUltra = const Color(0xFF0A101D).withOpacity(0.85);
  static final Color glassStrong = const Color(0xFF0F172A).withOpacity(0.72);
  static final Color glassMedium = const Color(0xFF1E293B).withOpacity(0.55);
  static final Color glassSoft = const Color(0xFF334155).withOpacity(0.35);
  static final Color glassFloating = const Color(0xFF0F172A).withOpacity(0.78);

  // Specular Highlights & Borders
  static final Color glassBorder = Colors.white.withOpacity(0.12);
  static final Color glassBorderSubtle = Colors.white.withOpacity(0.06);
  static final Color glassHighlight = Colors.white.withOpacity(0.22);
  static final Color glassShadow = Colors.black.withOpacity(0.45);

  // Gradients
  static const LinearGradient primaryGradient = LinearGradient(
    colors: [Color(0xFF0A84FF), Color(0xFF64D2FF)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient emergencyGradient = LinearGradient(
    colors: [Color(0xFFFF453A), Color(0xFFFF9F0A)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient glassSurfaceGradient = LinearGradient(
    colors: [
      Color(0x28FFFFFF),
      Color(0x05FFFFFF),
    ],
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
  );
}
