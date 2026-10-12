import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';

import 'design_system/tokens/colors.dart';
import 'design_system/components/glass_container.dart';
import 'design_system/components/glass_bottom_bar.dart';
import 'design_system/components/spatial_radar_view.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const ProviderScope(child: CivicPulseMobileApp()));
}

class CivicPulseMobileApp extends StatelessWidget {
  const CivicPulseMobileApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'CivicPulse Spatial Mobile',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: CivicPulseColors.bgCanvas,
        textTheme: GoogleFonts.interTextTheme(ThemeData.dark().textTheme),
        colorScheme: const ColorScheme.dark(
          primary: CivicPulseColors.accentPrimary,
          secondary: CivicPulseColors.accentCyan,
          surface: CivicPulseColors.bgSurface,
        ),
      ),
      home: const SpatialHomeScreen(),
    );
  }
}

class SpatialHomeScreen extends StatefulWidget {
  const SpatialHomeScreen({Key? key}) : super(key: key);

  @override
  State<SpatialHomeScreen> createState() => _SpatialHomeScreenState();
}

class _SpatialHomeScreenState extends State<SpatialHomeScreen> {
  int _currentIndex = 0;

  // Canonical Civic Location State (Coimbatore reference)
  String _selectedCity = 'Coimbatore';
  String _selectedName = 'Coimbatore Institute of Technology';
  String _selectedAddress = 'Avinashi Rd, Civil Aerodrome Post, Coimbatore, Tamil Nadu 641014';
  double _selectedLat = 11.0289;
  double _selectedLng = 77.0279;

  final List<Map<String, dynamic>> _savedLocations = [
    {
      'name': 'Home',
      'icon': Icons.home_rounded,
      'address': 'DB Road, RS Puram, Coimbatore',
      'city': 'Coimbatore',
      'lat': 11.0088,
      'lng': 76.9497,
    },
    {
      'name': 'College (CIT)',
      'icon': Icons.school_rounded,
      'address': 'Avinashi Rd, Peelamedu, Coimbatore',
      'city': 'Coimbatore',
      'lat': 11.0289,
      'lng': 77.0279,
    },
    {
      'name': 'Work (Tidel Park)',
      'icon': Icons.work_rounded,
      'address': 'ELCOT SEZ, Civil Aerodrome Post, Coimbatore',
      'city': 'Coimbatore',
      'lat': 11.0371,
      'lng': 77.0428,
    },
  ];

  void _requestLocationPermission() {
    showDialog(
      context: context,
      builder: (ctx) => BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
        child: AlertDialog(
          backgroundColor: CivicPulseColors.glassUltra,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(24),
            side: const BorderSide(color: CivicPulseColors.glassBorder, width: 1.5),
          ),
          title: const Row(
            children: [
              Icon(Icons.location_on_rounded, color: CivicPulseColors.accentCyan),
              SizedBox(width: 10),
              Text('Location Permission', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            ],
          ),
          content: const Text(
            'CivicPulse uses your precise GPS location to detect nearby civic hazards, visualize local infrastructure stress, and direct field response teams in real time.',
            style: TextStyle(fontSize: 13, color: CivicPulseColors.textSecondary, height: 1.4),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Not Now', style: TextStyle(color: CivicPulseColors.textSecondary)),
            ),
            ElevatedButton(
              onPressed: () {
                Navigator.pop(ctx);
                setState(() {
                  _selectedCity = 'Coimbatore';
                  _selectedName = 'Current GPS Position';
                  _selectedAddress = 'Peelamedu, Coimbatore (~8m GPS Accuracy)';
                  _selectedLat = 11.0295;
                  _selectedLng = 77.0282;
                });
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    backgroundColor: CivicPulseColors.glassStrong,
                    content: const Row(
                      children: [
                        Icon(Icons.check_circle_rounded, color: CivicPulseColors.accentSuccess),
                        SizedBox(width: 10),
                        Text('GPS Location synchronized (~8m precision)'),
                      ],
                    ),
                    behavior: SnackBarBehavior.floating,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                );
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: CivicPulseColors.accentPrimary,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: const Text('Allow Location'),
            ),
          ],
        ),
      ),
    );
  }

  void _showLocationSelectorModal(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (ctx) => BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 24, sigmaY: 24),
        child: Container(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
          decoration: BoxDecoration(
            color: CivicPulseColors.glassUltra,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(32)),
            border: Border.all(color: CivicPulseColors.glassBorder, width: 1.5),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.3),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 18),
              const Row(
                children: [
                  Icon(Icons.near_me_rounded, color: CivicPulseColors.accentCyan, size: 20),
                  SizedBox(width: 8),
                  Text(
                    'Active Civic Focus Area',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              const Text(
                'Select the municipal territory to monitor and report',
                style: TextStyle(fontSize: 12, color: CivicPulseColors.textSecondary),
              ),
              const SizedBox(height: 18),

              // Search Places Field
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.06),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: CivicPulseColors.glassBorder),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.search_rounded, color: CivicPulseColors.accentCyan, size: 20),
                    SizedBox(width: 10),
                    Expanded(
                      child: TextField(
                        decoration: InputDecoration(
                          hintText: 'Search city, landmark or postal code...',
                          hintStyle: TextStyle(color: CivicPulseColors.textSecondary, fontSize: 13),
                          border: InputBorder.none,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // GPS Button
              InkWell(
                onTap: () {
                  Navigator.pop(ctx);
                  _requestLocationPermission();
                },
                borderRadius: BorderRadius.circular(16),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(
                    color: CivicPulseColors.accentPrimary.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: CivicPulseColors.accentCyan.withOpacity(0.4)),
                  ),
                  child: const Row(
                    children: [
                      Icon(Icons.my_location_rounded, color: CivicPulseColors.accentCyan, size: 20),
                      SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Use Current GPS Location', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                            Text('High-precision satellite geolocation', style: TextStyle(color: CivicPulseColors.textSecondary, fontSize: 11)),
                          ],
                        ),
                      ),
                      Icon(Icons.chevron_right, color: CivicPulseColors.accentCyan),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 18),

              const Text(
                'SAVED LOCATIONS',
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1.0, color: CivicPulseColors.textSecondary),
              ),
              const SizedBox(height: 8),

              ..._savedLocations.map((loc) => InkWell(
                onTap: () {
                  setState(() {
                    _selectedName = loc['name'];
                    _selectedCity = loc['city'];
                    _selectedAddress = loc['address'];
                    _selectedLat = loc['lat'];
                    _selectedLng = loc['lng'];
                  });
                  Navigator.pop(ctx);
                },
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: CivicPulseColors.accentPrimary.withOpacity(0.12),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Icon(loc['icon'] as IconData, color: CivicPulseColors.accentCyan, size: 18),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(loc['name'], style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                            Text(loc['address'], style: const TextStyle(color: CivicPulseColors.textSecondary, fontSize: 11), maxLines: 1, overflow: TextOverflow.ellipsis),
                          ],
                        ),
                      ),
                      if (_selectedName == loc['name'])
                        const Icon(Icons.check_circle_rounded, color: CivicPulseColors.accentSuccess, size: 18),
                    ],
                  ),
                ),
              )),

              const SizedBox(height: 16),
              ElevatedButton.icon(
                onPressed: () {
                  Navigator.pop(ctx);
                  setState(() {
                    _currentIndex = 1; // Switch to 3D/Google Map tab
                  });
                },
                icon: const Icon(Icons.map_rounded),
                label: const Text('Select Pin on Live Map'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: CivicPulseColors.glassStrong,
                  foregroundColor: Colors.white,
                  minimumSize: const Size.fromHeight(46),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                    side: const BorderSide(color: CivicPulseColors.glassBorder),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showReportModal(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (ctx) => BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
        child: Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: CivicPulseColors.glassUltra,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(32)),
            border: Border.all(color: CivicPulseColors.glassBorder, width: 1.5),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.3),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 20),
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: CivicPulseColors.accentPrimary.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.camera_enhance_rounded, color: CivicPulseColors.accentCyan),
                  ),
                  const SizedBox(width: 12),
                  const Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Autonomous Hazard Capture',
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                      Text(
                        'YOLOv8 Computer Vision Triage',
                        style: TextStyle(fontSize: 12, color: CivicPulseColors.textSecondary),
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 24),
              // Camera Preview Mockup Frame
              Container(
                height: 180,
                width: double.infinity,
                decoration: BoxDecoration(
                  color: Colors.black.withOpacity(0.5),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: CivicPulseColors.accentCyan.withOpacity(0.4)),
                ),
                child: Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.center_focus_strong_rounded, size: 48, color: CivicPulseColors.accentCyan),
                      const SizedBox(height: 8),
                      Text(
                        'Align hazard inside frame',
                        style: TextStyle(fontSize: 13, color: Colors.white.withOpacity(0.8)),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 20),
              ElevatedButton.icon(
                onPressed: () => Navigator.pop(ctx),
                icon: const Icon(Icons.camera_alt),
                label: const Text('Capture & Run AI Inference'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: CivicPulseColors.accentPrimary,
                  foregroundColor: Colors.white,
                  minimumSize: const Size.fromHeight(50),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                ),
              ),
              const SizedBox(height: 12),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      extendBody: true,
      body: Stack(
        children: [
          // ── Ambient Background Lighting ───────────────────────
          Positioned(
            top: -60,
            right: -60,
            child: Container(
              width: 260,
              height: 260,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: CivicPulseColors.accentPrimary.withOpacity(0.18),
              ),
            ),
          ),
          Positioned(
            top: 250,
            left: -80,
            child: Container(
              width: 240,
              height: 240,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: CivicPulseColors.accentCyan.withOpacity(0.12),
              ),
            ),
          ),

          // ── Main Spatial Scrollable Body ──────────────────────
          SafeArea(
            bottom: false,
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 110),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // ── Premium Top Bar: Brand, Location Pill & Profile ──
                  Row(
                    children: [
                      // City Brand Dot & Greeting
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Container(
                                width: 8,
                                height: 8,
                                decoration: const BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: CivicPulseColors.accentSuccess,
                                ),
                              ),
                              const SizedBox(width: 6),
                              const Text(
                                'CIVICPULSE • LIVE GRID',
                                style: TextStyle(
                                  fontSize: 10,
                                  letterSpacing: 1.0,
                                  fontWeight: FontWeight.bold,
                                  color: CivicPulseColors.accentCyan,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 2),
                          const Text(
                            'Civic Operations',
                            style: TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.w800,
                              letterSpacing: -0.5,
                            ),
                          ),
                        ],
                      ),
                      const Spacer(),

                      // Notification Pill
                      GlassContainer(
                        borderRadius: 30,
                        padding: const EdgeInsets.all(8),
                        tier: GlassTier.floating,
                        child: const Icon(Icons.notifications_none_rounded, size: 18, color: Colors.white),
                      ),
                      const SizedBox(width: 8),

                      // Profile Avatar Capsule
                      GlassContainer(
                        borderRadius: 30,
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        tier: GlassTier.floating,
                        child: Row(
                          children: [
                            CircleAvatar(
                              radius: 13,
                              backgroundColor: CivicPulseColors.accentPrimary.withOpacity(0.3),
                              child: const Icon(Icons.person, size: 15, color: Colors.white),
                            ),
                            const SizedBox(width: 6),
                            const Text('Citizen', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // ── Prominent Floating Liquid Glass Location Switcher Capsule ──
                  GestureDetector(
                    onTap: () => _showLocationSelectorModal(context),
                    child: GlassContainer(
                      tier: GlassTier.floating,
                      glow: true,
                      borderRadius: 18,
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(6),
                            decoration: BoxDecoration(
                              color: CivicPulseColors.accentPrimary.withOpacity(0.2),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(Icons.location_on_rounded, color: CivicPulseColors.accentCyan, size: 18),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Text(
                                      _selectedCity,
                                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                    ),
                                    const SizedBox(width: 4),
                                    const Icon(Icons.keyboard_arrow_down_rounded, size: 16, color: CivicPulseColors.accentCyan),
                                  ],
                                ),
                                Text(
                                  _selectedAddress,
                                  style: const TextStyle(fontSize: 11, color: CivicPulseColors.textSecondary),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ],
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: CivicPulseColors.accentCyan.withOpacity(0.12),
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(color: CivicPulseColors.accentCyan.withOpacity(0.3)),
                            ),
                            child: const Text('Change', style: TextStyle(fontSize: 10, color: CivicPulseColors.accentCyan, fontWeight: FontWeight.bold)),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // ── Spatial 3D Radar Hero Canvas ──────────────
                  GlassContainer(
                    tier: GlassTier.ultra,
                    glow: true,
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Row(
                              children: [
                                Icon(Icons.radar_rounded, color: CivicPulseColors.accentCyan, size: 20),
                                SizedBox(width: 8),
                                Text(
                                  'Nearby Civic Radar',
                                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                                ),
                              ],
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: CivicPulseColors.accentPrimary.withOpacity(0.2),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: const Text(
                                'Radius: 1.5 km',
                                style: TextStyle(fontSize: 11, color: CivicPulseColors.accentCyan, fontWeight: FontWeight.w600),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 10),
                        const SpatialRadarView(height: 180),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // ── Emergency One-Tap SOS Capsule ─────────────
                  GlassContainer(
                    tier: GlassTier.floating,
                    glow: true,
                    glowColor: CivicPulseColors.accentDanger,
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: CivicPulseColors.accentDanger.withOpacity(0.2),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.broadcast_on_personal_rounded, color: CivicPulseColors.accentDanger, size: 22),
                        ),
                        const SizedBox(width: 14),
                        const Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Emergency One-Tap SOS',
                                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                              ),
                              Text(
                                'Direct uplink to Fire, Police & Disaster Response',
                                style: TextStyle(color: CivicPulseColors.textSecondary, fontSize: 11),
                              ),
                            ],
                          ),
                        ),
                        ElevatedButton(
                          onPressed: () {},
                          style: ElevatedButton.styleFrom(
                            backgroundColor: CivicPulseColors.accentDanger,
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                          ),
                          child: const Text('SOS', style: TextStyle(fontWeight: FontWeight.bold)),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),

                  // ── Telemetry Metric Counters ─────────────────
                  Row(
                    children: [
                      Expanded(
                        child: GlassContainer(
                          tier: GlassTier.strong,
                          padding: const EdgeInsets.all(14),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: const [
                              Text('Resolved SLA', style: TextStyle(color: CivicPulseColors.textSecondary, fontSize: 11)),
                              SizedBox(height: 4),
                              Text('98.4%', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: CivicPulseColors.accentSuccess)),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: GlassContainer(
                          tier: GlassTier.strong,
                          padding: const EdgeInsets.all(14),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: const [
                              Text('Avg Response', style: TextStyle(color: CivicPulseColors.textSecondary, fontSize: 11)),
                              SizedBox(height: 4),
                              Text('24m', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: CivicPulseColors.accentCyan)),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: GlassContainer(
                          tier: GlassTier.strong,
                          padding: const EdgeInsets.all(14),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: const [
                              Text('AI Accuracy', style: TextStyle(color: CivicPulseColors.textSecondary, fontSize: 11)),
                              SizedBox(height: 4),
                              Text('96.2%', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: CivicPulseColors.accentPurple)),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),

                  // ── Nearby Live Incident Feed ─────────────────
                  const Text(
                    'Active Incident Stream',
                    style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold, letterSpacing: -0.3),
                  ),
                  const SizedBox(height: 12),

                  GlassContainer(
                    tier: GlassTier.strong,
                    padding: const EdgeInsets.all(14),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: CivicPulseColors.accentWarning.withOpacity(0.18),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Icon(Icons.warning_amber_rounded, color: CivicPulseColors.accentWarning),
                        ),
                        const SizedBox(width: 14),
                        const Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Deep Asphalt Pothole Cluster',
                                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                              ),
                              SizedBox(height: 2),
                              Text(
                                'Sector 3 • AI Confirmed 96% • SLA 02:40:15',
                                style: TextStyle(color: CivicPulseColors.textSecondary, fontSize: 11),
                              ),
                            ],
                          ),
                        ),
                        const Icon(Icons.chevron_right, color: CivicPulseColors.textSecondary),
                      ],
                    ),
                  ),
                  const SizedBox(height: 10),

                  GlassContainer(
                    tier: GlassTier.strong,
                    padding: const EdgeInsets.all(14),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: CivicPulseColors.accentPrimary.withOpacity(0.18),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Icon(Icons.water_drop_rounded, color: CivicPulseColors.accentPrimary),
                        ),
                        const SizedBox(width: 14),
                        const Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Storm Drainage Overflow',
                                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                              ),
                              SizedBox(height: 2),
                              Text(
                                'Dispatched to Quick Response Crew #2',
                                style: TextStyle(color: CivicPulseColors.textSecondary, fontSize: 11),
                              ),
                            ],
                          ),
                        ),
                        const Icon(Icons.chevron_right, color: CivicPulseColors.textSecondary),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),

          // ── Floating Liquid Glass Bottom Navigation Dock ──────
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            child: GlassBottomBar(
              currentIndex: _currentIndex,
              onTap: (idx) => setState(() => _currentIndex = idx),
              onReportTap: () => _showReportModal(context),
            ),
          ),
        ],
      ),
    );
  }
}
