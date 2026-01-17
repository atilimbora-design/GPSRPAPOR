import 'package:flutter/foundation.dart'; // TargetPlatform için
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart' as google_maps;
import 'package:flutter_map/flutter_map.dart' as flutter_map;
import 'package:latlong2/latlong.dart' as latlong; // flutter_map için
import 'package:provider/provider.dart';
import '../services/socket_service.dart';

class AdminMapScreen extends StatefulWidget {
  const AdminMapScreen({super.key});

  @override
  State<AdminMapScreen> createState() => _AdminMapScreenState();
}

class _AdminMapScreenState extends State<AdminMapScreen> {
  // Google Maps Markers
  final Map<int, google_maps.Marker> _googleMarkers = {};
  google_maps.GoogleMapController? _googleMapController;

  // Flutter Map Markers (Windows/Desktop)
  final List<flutter_map.Marker> _flutterMarkers = [];
  final flutter_map.MapController _flutterMapController = flutter_map.MapController();

  // Harita Merkezi (Başlangıç: İzmir)
  static const _initialLat = 38.4192;
  static const _initialLng = 27.1287;

  @override
  void initState() {
    super.initState();
    final socketService = Provider.of<SocketService>(context, listen: false);
    
    // Konum Güncellemelerini Dinle
    socketService.socket?.on('locationUpdate', (data) {
      if (!mounted) return;
      setState(() {
        final userId = data['userId'];
        final lat = data['latitude'];
        final lng = data['longitude'];
        final name = data['name'];
        final code = data['code'];
        final time = '${DateTime.now().hour}:${DateTime.now().minute}';

        // 1. Google Maps (Mobil) için Marker Güncelle
        if (defaultTargetPlatform == TargetPlatform.android || defaultTargetPlatform == TargetPlatform.iOS) {
          _googleMarkers[userId] = google_maps.Marker(
            markerId: google_maps.MarkerId(userId.toString()),
            position: google_maps.LatLng(lat, lng),
            infoWindow: google_maps.InfoWindow(
              title: '$code - $name',
              snippet: 'Son: $time',
            ),
            icon: google_maps.BitmapDescriptor.defaultMarkerWithHue(google_maps.BitmapDescriptor.hueOrange),
          );
        }
        
        // 2. Flutter Map (Windows) için Marker Güncelle
        else {
          // Mevcut markeri bul ve güncelle veya yeni ekle
          final existingIndex = _flutterMarkers.indexWhere((m) => m.key == Key(userId.toString()));
          
          final newMarker = flutter_map.Marker(
            key: Key(userId.toString()),
            point: latlong.LatLng(lat, lng),
            width: 80,
            height: 80,
            child: Column(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(8),
                    boxShadow: const [BoxShadow(blurRadius: 4, color: Colors.black26)],
                  ),
                  child: Text('$code', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 10)),
                ),
                const Icon(Icons.location_on, color: Colors.orange, size: 40),
              ],
            ),
          );

          if (existingIndex != -1) {
            _flutterMarkers[existingIndex] = newMarker;
          } else {
            _flutterMarkers.add(newMarker);
          }
          
          // Opsiyonel: Haritayı hareket ettir (izleme modu açıksa)
          // _flutterMapController.move(latlong.LatLng(lat, lng), _flutterMapController.camera.zoom);
        }
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    bool isMobile = defaultTargetPlatform == TargetPlatform.android || defaultTargetPlatform == TargetPlatform.iOS;

    return Scaffold(
      appBar: AppBar(title: const Text('Personel Canlı Takip'), backgroundColor: const Color(0xFF1E1E1E), foregroundColor: Colors.white,),
      body: isMobile
          ? _buildGoogleMap()
          : _buildFlutterMap(),
    );
  }

  Widget _buildGoogleMap() {
    return google_maps.GoogleMap(
      initialCameraPosition: const google_maps.CameraPosition(
        target: google_maps.LatLng(_initialLat, _initialLng),
        zoom: 12,
      ),
      markers: _googleMarkers.values.toSet(),
      onMapCreated: (controller) => _googleMapController = controller,
      myLocationEnabled: false,
      mapType: google_maps.MapType.normal,
    );
  }

  Widget _buildFlutterMap() {
    return flutter_map.FlutterMap(
      mapController: _flutterMapController,
      options: const flutter_map.MapOptions(
        initialCenter: latlong.LatLng(_initialLat, _initialLng),
        initialZoom: 12,
      ),
      children: [
        flutter_map.TileLayer(
          urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
          userAgentPackageName: 'com.atilimgida.gpsrapor',
        ),
        flutter_map.MarkerLayer(
          markers: _flutterMarkers,
        ),
        const flutter_map.RichAttributionWidget(
          attributions: [
            flutter_map.TextSourceAttribution(
              'OpenStreetMap contributors',
            ),
          ],
        ),
      ],
    );
  }
}
