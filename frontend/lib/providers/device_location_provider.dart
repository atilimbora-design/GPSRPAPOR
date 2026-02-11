import 'dart:async';
import 'package:flutter/material.dart';
import '../models/location_update.dart';

class DeviceLocationProvider extends ChangeNotifier {
  final Map<String, LocationUpdate> _latestByDevice = {};
  StreamSubscription<LocationUpdate>? _subscription;

  LocationUpdate? getLatest(String deviceId) => _latestByDevice[deviceId];

  bool isStale(String deviceId, {Duration threshold = const Duration(minutes: 2)}) {
    final latest = _latestByDevice[deviceId];
    if (latest == null) return true;
    return DateTime.now().difference(latest.timestamp) > threshold;
  }

  void setStream(Stream<LocationUpdate> stream) {
    _subscription?.cancel();
    _subscription = stream.listen((update) {
      _latestByDevice[update.deviceId] = update;
      notifyListeners();
    });
  }

  void addUpdate(LocationUpdate update) {
    _latestByDevice[update.deviceId] = update;
    notifyListeners();
  }

  @override
  void dispose() {
    _subscription?.cancel();
    super.dispose();
  }
}
