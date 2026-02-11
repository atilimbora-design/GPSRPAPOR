class LocationUpdate {
  final String? id;
  final double lat;
  final double lng;
  final double? accuracy;
  final double? altitude;
  final double? speed;
  final double? heading;
  final double? bearing;
  final DateTime timestamp;
  final String deviceId;
  final double? batteryLevel;
  final String? source;
  final bool synced;

  const LocationUpdate({
    this.id,
    required this.lat,
    required this.lng,
    this.accuracy,
    this.altitude,
    this.speed,
    this.heading,
    this.bearing,
    required this.timestamp,
    required this.deviceId,
    this.batteryLevel,
    this.source,
    this.synced = false,
  });

  // Convenience getters for compatibility
  double get latitude => lat;
  double get longitude => lng;

  factory LocationUpdate.fromJson(Map<String, dynamic> json) {
    return LocationUpdate(
      id: json['id']?.toString(),
      lat: (json['lat'] as num).toDouble(),
      lng: (json['lng'] as num).toDouble(),
      accuracy: json['accuracy'] == null ? null : (json['accuracy'] as num).toDouble(),
      altitude: json['altitude'] == null ? null : (json['altitude'] as num).toDouble(),
      speed: json['speed'] == null ? null : (json['speed'] as num).toDouble(),
      heading: json['heading'] == null ? null : (json['heading'] as num).toDouble(),
      bearing: json['bearing'] == null ? null : (json['bearing'] as num).toDouble(),
      timestamp: DateTime.tryParse(json['timestamp']?.toString() ?? '') ?? DateTime.now(),
      deviceId: json['deviceId']?.toString() ?? '',
      batteryLevel: json['batteryLevel'] == null ? null : (json['batteryLevel'] as num).toDouble(),
      source: json['source']?.toString(),
      synced: (json['synced'] as int?) == 1 || (json['synced'] as bool?) == true,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      if (id != null) 'id': id,
      'lat': lat,
      'lng': lng,
      if (accuracy != null) 'accuracy': accuracy,
      if (altitude != null) 'altitude': altitude,
      if (speed != null) 'speed': speed,
      if (heading != null) 'heading': heading,
      if (bearing != null) 'bearing': bearing,
      'timestamp': timestamp.toIso8601String(),
      'deviceId': deviceId,
      if (batteryLevel != null) 'batteryLevel': batteryLevel,
      if (source != null) 'source': source,
      'synced': synced ? 1 : 0,
    };
  }

  LocationUpdate copyWith({
    String? id,
    double? lat,
    double? lng,
    double? accuracy,
    double? altitude,
    double? speed,
    double? heading,
    double? bearing,
    DateTime? timestamp,
    String? deviceId,
    double? batteryLevel,
    String? source,
    bool? synced,
  }) {
    return LocationUpdate(
      id: id ?? this.id,
      lat: lat ?? this.lat,
      lng: lng ?? this.lng,
      accuracy: accuracy ?? this.accuracy,
      altitude: altitude ?? this.altitude,
      speed: speed ?? this.speed,
      heading: heading ?? this.heading,
      bearing: bearing ?? this.bearing,
      timestamp: timestamp ?? this.timestamp,
      deviceId: deviceId ?? this.deviceId,
      batteryLevel: batteryLevel ?? this.batteryLevel,
      source: source ?? this.source,
      synced: synced ?? this.synced,
    );
  }
}

