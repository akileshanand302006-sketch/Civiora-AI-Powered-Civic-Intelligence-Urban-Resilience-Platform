import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../tokens/colors.dart';

class SpatialRadarView extends StatefulWidget {
  final double height;
  final Function(String)? onSelectNode;

  const SpatialRadarView({
    Key? key,
    this.height = 200,
    this.onSelectNode,
  }) : super(key: key);

  @override
  State<SpatialRadarView> createState() => _SpatialRadarViewState();
}

class _SpatialRadarViewState extends State<SpatialRadarView>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 4),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: widget.height,
      width: double.infinity,
      child: AnimatedBuilder(
        animation: _controller,
        builder: (context, child) {
          return CustomPaint(
            painter: _RadarGridPainter(progress: _controller.value),
          );
        },
      ),
    );
  }
}

class _RadarGridPainter extends CustomPainter {
  final double progress;

  _RadarGridPainter({required this.progress});

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2 + 10);
    final maxRadius = math.min(size.width, size.height) * 0.45;

    // Background gradient glow
    final bgPaint = Paint()
      ..shader = RadialGradient(
        colors: [
          CivicPulseColors.accentPrimary.withOpacity(0.12),
          Colors.transparent,
        ],
      ).createShader(Rect.fromCircle(center: center, radius: maxRadius * 1.2));
    canvas.drawCircle(center, maxRadius * 1.2, bgPaint);

    // Isometric Grid lines
    final gridPaint = Paint()
      ..color = CivicPulseColors.accentPrimary.withOpacity(0.15)
      ..strokeWidth = 1.0
      ..style = PaintingStyle.stroke;

    // Draw concentric radar rings
    for (int i = 1; i <= 3; i++) {
      final r = maxRadius * (i / 3);
      canvas.drawCircle(center, r, gridPaint);
    }

    // Cross axes
    canvas.drawLine(
      Offset(center.dx - maxRadius, center.dy),
      Offset(center.dx + maxRadius, center.dy),
      gridPaint,
    );
    canvas.drawLine(
      Offset(center.dx, center.dy - maxRadius),
      Offset(center.dx, center.dy + maxRadius),
      gridPaint,
    );

    // Rotating Radar Sweep Beam
    final angle = progress * 2 * math.pi;
    final sweepPaint = Paint()
      ..shader = SweepGradient(
        center: Alignment.center,
        startAngle: 0.0,
        endAngle: math.pi / 2,
        colors: [
          Colors.transparent,
          CivicPulseColors.accentCyan.withOpacity(0.4),
        ],
        transform: GradientRotation(angle),
      ).createShader(Rect.fromCircle(center: center, radius: maxRadius))
      ..style = PaintingStyle.fill;

    canvas.drawCircle(center, maxRadius, sweepPaint);

    // Simulated 3D Incident Nodes
    _drawNode(canvas, center + Offset(-maxRadius * 0.45, -maxRadius * 0.3), CivicPulseColors.accentDanger, 'EMERGENCY', progress);
    _drawNode(canvas, center + Offset(maxRadius * 0.55, -maxRadius * 0.2), CivicPulseColors.accentWarning, 'POTHOLE', progress + 0.3);
    _drawNode(canvas, center + Offset(-maxRadius * 0.25, maxRadius * 0.4), CivicPulseColors.accentCyan, 'DRAINAGE', progress + 0.6);
    _drawNode(canvas, center + Offset(maxRadius * 0.35, maxRadius * 0.5), CivicPulseColors.accentSuccess, 'RESOLVED', progress + 0.8);
  }

  void _drawNode(Canvas canvas, Offset pos, Color color, String label, double anim) {
    final rippleProgress = (anim % 1.0);
    final rippleRadius = 6.0 + rippleProgress * 14.0;
    final rippleOpacity = math.max(0.0, 1.0 - rippleProgress);

    // Ripple wave
    final ripplePaint = Paint()
      ..color = color.withOpacity(rippleOpacity * 0.6)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.5;
    canvas.drawCircle(pos, rippleRadius, ripplePaint);

    // Core dot
    final dotPaint = Paint()
      ..color = color
      ..style = PaintingStyle.fill;
    canvas.drawCircle(pos, 4.5, dotPaint);

    // Center glow
    final glowPaint = Paint()
      ..color = Colors.white
      ..style = PaintingStyle.fill;
    canvas.drawCircle(pos, 2.0, glowPaint);
  }

  @override
  bool shouldRepaint(covariant _RadarGridPainter oldDelegate) {
    return oldDelegate.progress != progress;
  }
}
