import 'dart:async';
import 'dart:convert';
import 'package:geolocator/geolocator.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:battery_plus/battery_plus.dart';
import 'package:flutter_background_service/flutter_background_service.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/location_update.dart';
import 'database_service.dart';

class LocationService {
  static final LocationService _instance = LocationService._internal();
  factory LocationService() => _instance;
  LocationService._internal();

  final StreamController<LocationUpdate> _locationController = StreamController<LocationUpdate>.broadcast();
  Stream<LocationUpdate> get locationStream => _locationController.stream;

  Timer? _locationTimer;
  bool _isTracking = false;
  bool _isBackgroundEnabled = false;
  final Battery _battery = Battery();
  final DatabaseService _db = DatabaseService();

  // Location settings
  static const LocationSettings _locationSettings = LocationSettings(
    accuracy: LocationAccuracy.high,
    distanceFilter: 10, // Minimum distance (in meters) to trigger update
  );

  /// Start location tracking
  Future<void> startTracking() async {
    if (_isTracking) return;

    // Check and request permissions
    final hasPermission = await _requestLocationPermission();
    if (!hasPermission) {
      throw Exception('Location permission denied');
    }

    _isTracking = true;
    
    // Start periodic location updates
    _startLocationUpdates();
    
    print('Location tracking started');
  }

  /// Stop location tracking
  Future<void> stopTracking() async {
    _isTracking = false;
    _locationTimer?.cancel();
    _locationTimer = null;
    
    print('Location tracking stopped');
  }

  /// Enable background location tracking
  Future<void> enableBackgroundTracking() async {
    if (_isBackgroundEnabled) return;

    // Request background location permission
    final status = await Permission.locationAlways.request();
    if (!status.isGranted) {
      throw Exception('Background location permission denied');
    }

    _isBackgroundEnabled = true;
    
    // Initialize background service
    await _initializeBackgroundService();
    
    print('Background location tracking enabled');
  }

  /// Get pending locations from local storage
  Future<List<LocationUpdate>> getPendingLocations() async {
    return await _db.getPendingLocations();
  }

  /// Start periodic location updates
  void _startLocationUpdates() {
    // Get update interval from settings (default 30 seconds)
    const updateInterval = Duration(seconds: 30);
    
    _locationTimer = Timer.periodic(updateInterval, (timer) async {
      if (!_isTracking) {
        timer.cancel();
        return;
      }

      try {
        await _getCurrentLocationAndStore();
      } catch (e) {
        print('Error getting location: $e');
      }
    });

    // Get initial location immediately
    _getCurrentLocationAndStore();
  }

  /// Get current location and store it
  Future<void> _getCurrentLocationAndStore() async {
    try {
      // Check if location services are enabled
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        print('Location services are disabled');
        return;
      }

      // Get current position
      Position position = await Geolocator.getCurrentPosition(
        locationSettings: _locationSettings,
      );

      // Get battery level
      int batteryLevel = await _battery.batteryLevel;

      // Create location update
      final locationUpdate = LocationUpdate(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        latitude: position.latitude,
        longitude: position.longitude,
        accuracy: position.accuracy,
        altitude: position.altitude,
        speed: position.speed,
        heading: position.heading,
        timestamp: DateTime.now(),
        batteryLevel: batteryLevel.toDouble(),
        source: _determineLocationSource(position.accuracy),
      );

      // Store in local database
      await _db.insertLocation(locationUpdate);

      // Emit to stream
      _locationController.add(locationUpdate);

      print('Location updated: ${position.latitude}, ${position.longitude}');
    } catch (e) {
      print('Error getting current location: $e');
      
      // Try network-based location as fallback
      await _tryNetworkLocation();
    }
  }

  /// Try to get network-based location as fallback
  Future<void> _tryNetworkLocation() async {
    try {
      Position position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.low,
        ),
      );

      int batteryLevel = await _battery.batteryLevel;

      final locationUpdate = LocationUpdate(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        latitude: position.latitude,
        longitude: position.longitude,
        accuracy: position.accuracy,
        altitude: position.altitude,
        speed: position.speed,
        heading: position.heading,
        timestamp: DateTime.now(),
        batteryLevel: batteryLevel.toDouble(),
        source: 'network',
      );

      await _db.insertLocation(locationUpdate);
      _locationController.add(locationUpdate);

      print('Network location updated: ${position.latitude}, ${position.longitude}');
    } catch (e) {
      print('Network location also failed: $e');
    }
  }

  /// Determine location source based on accuracy
  String _determineLocationSource(double accuracy) {
    if (accuracy <= 10) return 'gps';
    if (accuracy <= 100) return 'network';
    return 'passive';
  }

  /// Request location permissions
  Future<bool> _requestLocationPermission() async {
    LocationPermission permission = await Geolocator.checkPermission();
    
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        return false;
      }
    }
    
    if (permission == LocationPermission.deniedForever) {
      return false;
    }

    return true;
  }

  /// Initialize background service
  Future<void> _initializeBackgroundService() async {
    final service = FlutterBackgroundService();
    
    await service.configure(
      androidConfiguration: AndroidConfiguration(
        onStart: onStart,
        autoStart: true,
        isForegroundMode: true,
        notificationChannelId: 'gps_rapor_location',
        initialNotificationTitle: 'GPS Rapor',
        initialNotificationContent: 'Konum takibi aktif',
        foregroundServiceNotificationId: 888,
      ),
      iosConfiguration: IosConfiguration(
        autoStart: true,
        onForeground: onStart,
        onBackground: onIosBackground,
      ),
    );
  }

  /// Dispose resources
  void dispose() {
    _locationTimer?.cancel();
    _locationController.close();
  }
}

/// Background service entry point
@pragma('vm:entry-point')
void onStart(ServiceInstance service) async {
  if (service is AndroidServiceInstance) {
    service.on('setAsForeground').listen((event) {
      service.setAsForegroundService();
    });

    service.on('setAsBackground').listen((event) {
      service.setAsBackgroundService();
    });
  }

  service.on('stopService').listen((event) {
    service.stopSelf();
  });

  // Background location tracking
  Timer.periodic(const Duration(seconds: 60), (timer) async {
    if (service is AndroidServiceInstance) {
      if (await service.isForegroundService()) {
        await _backgroundLocationUpdate(service);
      }
    } else {
      await _backgroundLocationUpdate(service);
    }
  });
}

/// iOS background handler
@pragma('vm:entry-point')
Future<bool> onIosBackground(ServiceInstance service) async {
  await _backgroundLocationUpdate(service);
  return true;
}

/// Background location update
Future<void> _backgroundLocationUpdate(ServiceInstance service) async {
  try {
    // Check if location services are enabled
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) return;

    // Get current position
    Position position = await Geolocator.getCurrentPosition(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.medium,
      ),
    );

    // Get battery level
    final battery = Battery();
    int batteryLevel = await battery.batteryLevel;

    // Create location update
    final locationUpdate = LocationUpdate(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      latitude: position.latitude,
      longitude: position.longitude,
      accuracy: position.accuracy,
      altitude: position.altitude,
      speed: position.speed,
      heading: position.heading,
      timestamp: DateTime.now(),
      batteryLevel: batteryLevel.toDouble(),
      source: position.accuracy <= 50 ? 'gps' : 'network',
    );

    // Store in local database
    final db = DatabaseService();
    await db.insertLocation(locationUpdate);

    // Update notification
    if (service is AndroidServiceInstance) {
      service.setForegroundNotificationInfo(
        title: "GPS Rapor - Konum Takibi",
        content: "Son konum: ${position.latitude.toStringAsFixed(4)}, ${position.longitude.toStringAsFixed(4)}",
      );
    }

    print('Background location updated: ${position.latitude}, ${position.longitude}');
  } catch (e) {
    print('Background location error: $e');
  }
}

/// Battery-aware location service
class BatteryAwareLocationService extends LocationService {
  Timer? _batteryCheckTimer;
  int _currentUpdateInterval = 30; // seconds

  @override
  Future<void> startTracking() async {
    await super.startTracking();
    _startBatteryMonitoring();
  }

  @override
  Future<void> stopTracking() async {
    await super.stopTracking();
    _batteryCheckTimer?.cancel();
  }

  /// Start monitoring battery level and adjust update frequency
  void _startBatteryMonitoring() {
    _batteryCheckTimer = Timer.periodic(const Duration(minutes: 5), (timer) async {
      final batteryLevel = await _battery.batteryLevel;
      _adjustUpdateInterval(batteryLevel);
    });
  }

  /// Adjust update interval based on battery level
  void _adjustUpdateInterval(int batteryLevel) {
    int newInterval;
    
    if (batteryLevel <= 15) {
      // Critical battery: update every 5 minutes
      newInterval = 300;
    } else if (batteryLevel <= 30) {
      // Low battery: update every 2 minutes
      newInterval = 120;
    } else if (batteryLevel <= 50) {
      // Medium battery: update every minute
      newInterval = 60;
    } else {
      // Good battery: normal interval
      newInterval = 30;
    }

    if (newInterval != _currentUpdateInterval) {
      _currentUpdateInterval = newInterval;
      
      // Restart location updates with new interval
      if (_isTracking) {
        _locationTimer?.cancel();
        _locationTimer = Timer.periodic(Duration(seconds: newInterval), (timer) async {
          if (!_isTracking) {
            timer.cancel();
            return;
          }
          await _getCurrentLocationAndStore();
        });
      }
      
      print('Location update interval adjusted to ${newInterval}s (battery: $batteryLevel%)');
    }
  }
}