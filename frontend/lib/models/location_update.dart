class LocationUpdate {
  final double lat;
  final double lng;
  final double? bearing;
  final DateTime timestamp;
  final String deviceId;

  const LocationUpdate({
    required this.lat,
    required this.lng,
    required this.timestamp,
    required this.deviceId,
    this.bearing,
  });

  factory LocationUpdate.fromJson(Map<String, dynamic> json) {
    return LocationUpdate(
      lat: (json['lat'] as num).toDouble(),
      lng: (json['lng'] as num).toDouble(),
      bearing: json['bearing'] == null ? null : (json['bearing'] as num).toDouble(),
      timestamp: DateTime.tryParse(json['timestamp']?.toString() ?? '') ?? DateTime.now(),
      deviceId: json['deviceId']?.toString() ?? '',
    );
  }
}
