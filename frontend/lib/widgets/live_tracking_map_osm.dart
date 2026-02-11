import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../providers/device_location_provider.dart';

/// OpenStreetMap based live tracking map (no API key required).
class LiveTrackingMapOsm extends StatefulWidget {
  final DeviceLocationProvider provider;
  final String deviceId;
  final String? markerAvatarUrl;
  final String? markerLabel;
  final bool followCameraByDefault;
  final bool showPolyline;
  final Duration animationDuration;
  final int trailLength;

  const LiveTrackingMapOsm({
    super.key,
    required this.provider,
    required this.deviceId,
    this.markerAvatarUrl,
    this.markerLabel,
    this.followCameraByDefault = true,
    this.showPolyline = true,
    this.animationDuration = const Duration(milliseconds: 20000),
    this.trailLength = 20,
  });

  @override
  State<LiveTrackingMapOsm> createState() => _LiveTrackingMapOsmState();
}

class _LiveTrackingMapOsmState extends State<LiveTrackingMapOsm> with TickerProviderStateMixin {
  final MapController _mapController = MapController();
  AnimationController? _animationController;
  Animation<double>? _progress;

  LatLng? _currentPos;
  double _currentBearing = 0;
  bool _followCamera = true;
  DateTime? _lastUpdateTime;
  final List<LatLng> _trail = [];

  @override
  void initState() {
    super.initState();
    _followCamera = widget.followCameraByDefault;
    widget.provider.addListener(_onProviderUpdate);
    _onProviderUpdate();
  }

  @override
  void didUpdateWidget(covariant LiveTrackingMapOsm oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.provider != widget.provider) {
      oldWidget.provider.removeListener(_onProviderUpdate);
      widget.provider.addListener(_onProviderUpdate);
      _onProviderUpdate();
    }
    if (oldWidget.deviceId != widget.deviceId) {
      _currentPos = null;
      _trail.clear();
      _onProviderUpdate();
    }
  }

  @override
  void dispose() {
    widget.provider.removeListener(_onProviderUpdate);
    _animationController?.dispose();
    super.dispose();
  }

  void _onProviderUpdate() {
    final update = widget.provider.getLatest(widget.deviceId);
    if (update == null) return;

    final newPos = LatLng(update.lat, update.lng);
    final newBearing = update.bearing ??
        (_currentPos == null ? 0 : _calculateBearing(_currentPos!, newPos));

    _lastUpdateTime = update.timestamp;

    if (_currentPos == null) {
      setState(() {
        _currentPos = newPos;
        _currentBearing = newBearing;
        _trail.add(newPos);
      });
      _moveCameraIfNeeded(newPos);
      return;
    }

    _animateMarkerTo(newPos, newBearing);
  }

  void _animateMarkerTo(LatLng newPos, double newBearing) {
    _animationController?.stop();
    _animationController?.dispose();

    final startPos = _currentPos!;
    final startBearing = _currentBearing;

    _animationController = AnimationController(
      vsync: this,
      duration: widget.animationDuration,
    );

    _progress = Tween<double>(begin: 0, end: 1).animate(_animationController!)
      ..addListener(() {
        final t = _progress!.value;
        final lat = startPos.latitude + (newPos.latitude - startPos.latitude) * t;
        final lng = startPos.longitude + (newPos.longitude - startPos.longitude) * t;
        final bearing = _lerpAngle(startBearing, newBearing, t);

        setState(() {
          _currentPos = LatLng(lat, lng);
          _currentBearing = bearing;
        });

        _moveCameraIfNeeded(_currentPos!);
      });

    _animationController!.forward().whenComplete(() {
      if (!mounted) return;
      setState(() {
        _currentPos = newPos;
        _currentBearing = newBearing;
        _trail.add(newPos);
        if (_trail.length > widget.trailLength) {
          _trail.removeAt(0);
        }
      });
    });
  }

  void _moveCameraIfNeeded(LatLng pos) {
    if (!_followCamera) return;
    _mapController.move(pos, _mapController.camera.zoom);
  }

  double _calculateBearing(LatLng from, LatLng to) {
    final lat1 = _degToRad(from.latitude);
    final lat2 = _degToRad(to.latitude);
    final deltaLng = _degToRad(to.longitude - from.longitude);
    final y = math.sin(deltaLng) * math.cos(lat2);
    final x = math.cos(lat1) * math.sin(lat2) -
        math.sin(lat1) * math.cos(lat2) * math.cos(deltaLng);
    final bearing = math.atan2(y, x);
    return (_radToDeg(bearing) + 360) % 360;
  }

  double _lerpAngle(double start, double end, double t) {
    final delta = ((end - start + 540) % 360) - 180;
    return (start + delta * t + 360) % 360;
  }

  double _degToRad(double deg) => deg * math.pi / 180;
  double _radToDeg(double rad) => rad * 180 / math.pi;

  @override
  Widget build(BuildContext context) {
    final isStale = _lastUpdateTime == null
        ? true
        : DateTime.now().difference(_lastUpdateTime!) > const Duration(minutes: 2);

    final markerColor = isStale ? Colors.orangeAccent : Colors.blueAccent;

    return Stack(
      children: [
        FlutterMap(
          mapController: _mapController,
          options: MapOptions(
            initialCenter: _currentPos ?? const LatLng(38.423733, 27.142826),
            initialZoom: 14,
            onPositionChanged: (pos, hasGesture) {
              if (hasGesture) {
                setState(() {
                  _followCamera = false;
                });
              }
            },
          ),
          children: [
            TileLayer(
              urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
              userAgentPackageName: 'com.atilimgida.gpsrapor',
            ),
            if (widget.showPolyline && _trail.length > 1)
              PolylineLayer(
                polylines: [
                  Polyline(
                    points: List<LatLng>.from(_trail),
                    strokeWidth: 4,
                    color: Colors.lightBlueAccent,
                  )
                ],
              ),
            if (_currentPos != null)
              MarkerLayer(
                markers: [
                  Marker(
                    point: _currentPos!,
                    width: 60,
                    height: 70,
                    child: Transform.rotate(
                      angle: _degToRad(_currentBearing),
                      child: _buildMarker(markerColor),
                    ),
                  ),
                ],
              ),
          ],
        ),
        Positioned(
          top: 16,
          left: 16,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: Colors.black87,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(
              _lastUpdateTime == null
                  ? 'Bağlantı bekleniyor...'
                  : (isStale ? 'Bağlantı zayıf (2dk+)' : 'Canlı takip aktif'),
              style: const TextStyle(color: Colors.white),
            ),
          ),
        ),
        Positioned(
          bottom: 16,
          right: 16,
          child: FloatingActionButton.small(
            onPressed: () {
              setState(() {
                _followCamera = true;
              });
              if (_currentPos != null) _moveCameraIfNeeded(_currentPos!);
            },
            backgroundColor: _followCamera ? Colors.green : Colors.grey,
            child: const Icon(Icons.my_location, color: Colors.white),
          ),
        )
      ],
    );
  }

  Widget _buildMarker(Color markerColor) {
    if (widget.markerAvatarUrl != null && widget.markerAvatarUrl!.isNotEmpty) {
      return Stack(
        alignment: Alignment.topCenter,
        children: [
          Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(color: markerColor, width: 2),
                  image: DecorationImage(
                    image: NetworkImage(widget.markerAvatarUrl!),
                    fit: BoxFit.cover,
                  ),
                ),
              ),
              Container(
                width: 0,
                height: 0,
                decoration: BoxDecoration(
                  border: Border(
                    left: BorderSide(color: Colors.transparent, width: 8),
                    right: BorderSide(color: Colors.transparent, width: 8),
                    top: BorderSide(color: markerColor, width: 12),
                  ),
                ),
              ),
            ],
          ),
          if ((widget.markerLabel ?? '').isNotEmpty)
            Positioned(
              top: 28,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: Colors.black.withOpacity(0.6),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  widget.markerLabel!,
                  style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                ),
              ),
            ),
        ],
      );
    }

    return Container(
      decoration: BoxDecoration(
        color: markerColor,
        shape: BoxShape.circle,
        boxShadow: const [
          BoxShadow(color: Colors.black45, blurRadius: 6),
        ],
      ),
      child: const Icon(Icons.navigation, color: Colors.white),
    );
  }
}
