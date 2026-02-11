import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../providers/device_location_provider.dart';

/// Example usage:
/// 
/// ChangeNotifierProvider(
///   create: (_) => DeviceLocationProvider()..setStream(yourLocationStream),
///   child: Consumer<DeviceLocationProvider>(
///     builder: (_, provider, __) {
///       return LiveTrackingMap(
///         provider: provider,
///         deviceId: 'device-123',
///       );
///     },
///   ),
/// )
class LiveTrackingMap extends StatefulWidget {
  final DeviceLocationProvider provider;
  final String deviceId;
  final GoogleMapController? externalController;
  final bool followCameraByDefault;
  final bool showPolyline;
  final Duration animationDuration;
  final int trailLength;

  const LiveTrackingMap({
    super.key,
    required this.provider,
    required this.deviceId,
    this.externalController,
    this.followCameraByDefault = true,
    this.showPolyline = true,
    this.animationDuration = const Duration(milliseconds: 20000),
    this.trailLength = 20,
  });

  @override
  State<LiveTrackingMap> createState() => _LiveTrackingMapState();
}

class _LiveTrackingMapState extends State<LiveTrackingMap> with TickerProviderStateMixin {
  GoogleMapController? _mapController;
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
  void didUpdateWidget(covariant LiveTrackingMap oldWidget) {
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

    // Linear interpolation (tween) from 0..1
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
    final controller = widget.externalController ?? _mapController;
    controller?.moveCamera(CameraUpdate.newLatLng(pos));
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

    final markerHue = isStale ? BitmapDescriptor.hueOrange : BitmapDescriptor.hueAzure;
    final marker = _currentPos == null
        ? <Marker>{}
        : {
            Marker(
              markerId: MarkerId(widget.deviceId),
              position: _currentPos!,
              rotation: _currentBearing,
              flat: true,
              icon: BitmapDescriptor.defaultMarkerWithHue(markerHue),
              anchor: const Offset(0.5, 0.5),
            )
          };

    final polylines = widget.showPolyline && _trail.length > 1
        ? {
            Polyline(
              polylineId: const PolylineId('trail'),
              points: List<LatLng>.from(_trail),
              width: 4,
              color: Colors.lightBlueAccent,
            )
          }
        : <Polyline>{};

    return Stack(
      children: [
        GoogleMap(
          initialCameraPosition: CameraPosition(
            target: _currentPos ?? const LatLng(38.423733, 27.142826),
            zoom: 14,
          ),
          markers: marker,
          polylines: polylines,
          onMapCreated: (controller) {
            _mapController = controller;
            if (widget.externalController == null && _currentPos != null) {
              _moveCameraIfNeeded(_currentPos!);
            }
          },
          onCameraMoveStarted: () {
            setState(() {
              _followCamera = false;
            });
          },
          myLocationButtonEnabled: false,
          compassEnabled: true,
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
}
