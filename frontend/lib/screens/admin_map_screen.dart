import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:provider/provider.dart';
import '../services/socket_service.dart';

class AdminMapScreen extends StatefulWidget {
  const AdminMapScreen({super.key});

  @override
  State<AdminMapScreen> createState() => _AdminMapScreenState();
}

class _AdminMapScreenState extends State<AdminMapScreen> {
  // Flutter Map Markers (All Platforms)
  final List<Marker> _markers = [];
  final MapController _mapController = MapController();

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
        // final time = '${DateTime.now().hour}:${DateTime.now().minute}';

        // Mevcut markeri bul ve güncelle veya yeni ekle
        final existingIndex = _markers.indexWhere((m) => m.key == Key(userId.toString()));
        
        final newMarker = Marker(
          key: Key(userId.toString()),
          point: LatLng(lat, lng),
          width: 80,
          height: 80,
          child: Column(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  boxShadow: const [BoxShadow(blurRadius: 4, color: Colors.black26)],
                ),
                child: Text('$code', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 10)),
              ),
              const SizedBox(height: 2),
              CircleAvatar(
                radius: 18,
                backgroundColor: const Color(0xFFE65100), // Atılım Turuncu
                child: const Icon(Icons.person, color: Colors.white, size: 24),
              ),
            ],
          ),
        );

        if (existingIndex != -1) {
          _markers[existingIndex] = newMarker;
        } else {
          _markers.add(newMarker);
        }
        
        // Opsiyonel: Haritayı hareket ettir (izleme modu açıksa)
        // _mapController.move(LatLng(lat, lng), _mapController.camera.zoom);
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Personel Canlı Takip'), 
        backgroundColor: const Color(0xFF1E1E1E), 
        foregroundColor: Colors.white,
      ),
      body: FlutterMap(
        mapController: _mapController,
        options: const MapOptions(
          initialCenter: LatLng(_initialLat, _initialLng),
          initialZoom: 12,
        ),
        children: [
          TileLayer(
            urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
            userAgentPackageName: 'com.atilimgida.gpsrapor',
          ),
          MarkerLayer(
            markers: _markers,
          ),
          const RichAttributionWidget(
            attributions: [
              TextSourceAttribution(
                'OpenStreetMap contributors',
              ),
            ],
          ),
        ],
      ),
    );
  }
}
