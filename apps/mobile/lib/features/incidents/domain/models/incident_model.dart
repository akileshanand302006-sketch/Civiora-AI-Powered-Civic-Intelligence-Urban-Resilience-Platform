class MobileIncident {
  final String id;
  final String incidentNumber;
  final String category;
  final String title;
  final String description;
  final String status;
  final String priority;
  final bool isEmergency;
  final String address;
  final double lng;
  final double lat;
  final int riskScore;
  final DateTime createdAt;

  MobileIncident({
    required this.id,
    required this.incidentNumber,
    required this.category,
    required this.title,
    required this.description,
    required this.status,
    required this.priority,
    required this.isEmergency,
    required this.address,
    required this.lng,
    required this.lat,
    required this.riskScore,
    required this.createdAt,
  });

  factory MobileIncident.fromJson(Map<String, dynamic> json) {
    final location = json['location'] as Map<String, dynamic>? ?? {};
    final coords = (location['coordinates'] as List<dynamic>?) ?? [77.5946, 12.9716];
    final risk = json['risk'] as Map<String, dynamic>? ?? {};

    return MobileIncident(
      id: json['id'] ?? json['_id'] ?? '',
      incidentNumber: json['incidentNumber'] ?? '',
      category: json['category'] ?? 'pothole',
      title: json['title'] ?? '',
      description: json['description'] ?? '',
      status: json['status'] ?? 'reported',
      priority: json['priority'] ?? 'medium',
      isEmergency: json['isEmergency'] ?? false,
      address: location['address'] ?? '',
      lng: (coords[0] as num).toDouble(),
      lat: (coords[1] as num).toDouble(),
      riskScore: risk['score'] ?? 0,
      createdAt: DateTime.tryParse(json['createdAt'] ?? '') ?? DateTime.now(),
    );
  }
}
