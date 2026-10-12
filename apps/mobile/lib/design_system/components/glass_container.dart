import 'dart:ui';
import 'package:flutter/material.dart';
import '../tokens/colors.dart';

enum GlassTier { ultra, strong, medium, soft, floating }

class GlassContainer extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;
  final double borderRadius;
  final GlassTier tier;
  final bool glow;
  final Color? glowColor;
  final VoidCallback? onTap;
  final double? width;
  final double? height;

  const GlassContainer({
    Key? key,
    required this.child,
    this.padding,
    this.borderRadius = 20.0,
    this.tier = GlassTier.strong,
    this.glow = false,
    this.glowColor,
    this.onTap,
    this.width,
    this.height,
  }) : super(key: key);

  Color _getTierBgColor() {
    switch (tier) {
      case GlassTier.ultra:
        return CivicPulseColors.glassUltra;
      case GlassTier.strong:
        return CivicPulseColors.glassStrong;
      case GlassTier.medium:
        return CivicPulseColors.glassMedium;
      case GlassTier.soft:
        return CivicPulseColors.glassSoft;
      case GlassTier.floating:
        return CivicPulseColors.glassFloating;
    }
  }

  double _getTierBlur() {
    switch (tier) {
      case GlassTier.ultra:
        return 28.0;
      case GlassTier.strong:
        return 20.0;
      case GlassTier.medium:
        return 14.0;
      case GlassTier.soft:
        return 8.0;
      case GlassTier.floating:
        return 24.0;
    }
  }

  @override
  Widget build(BuildContext context) {
    final blur = _getTierBlur();
    final bg = _getTierBgColor();

    Widget box = Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(borderRadius),
        boxShadow: [
          BoxShadow(
            color: glow
                ? (glowColor ?? CivicPulseColors.accentPrimary).withOpacity(0.35)
                : CivicPulseColors.glassShadow,
            blurRadius: glow ? 28.0 : 16.0,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(borderRadius),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: blur, sigmaY: blur),
          child: Container(
            padding: padding ?? const EdgeInsets.all(16.0),
            decoration: BoxDecoration(
              color: bg,
              borderRadius: BorderRadius.circular(borderRadius),
              border: Border.all(
                color: CivicPulseColors.glassBorder,
                width: 1.2,
              ),
              gradient: CivicPulseColors.glassSurfaceGradient,
            ),
            child: child,
          ),
        ),
      ),
    );

    if (onTap != null) {
      return GestureDetector(
        onTap: onTap,
        child: box,
      );
    }

    return box;
  }
}
