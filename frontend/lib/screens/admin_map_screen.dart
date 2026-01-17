import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:provider/provider.dart';
import '../services/socket_service.dart';

class AdminMapScreen extends StatefulWidget {
  const AdminMapScreen({super.key});

  @override
  State<AdminMapScreen> createState() => _AdminMapScreenState();
}

class _AdminMapScreenState extends State<AdminMapScreen> {
  final Map<int, Marker> _markers = {};
  GoogleMapController? _mapController;

  @override
  void initState() {
    super.initState();
    final socketService = Provider.of<SocketService>(context, listen: false);
    
    // Konum Güncellemelerini Dinle
    socketService.socket?.on('locationUpdate', (data) {
      if (!mounted) return;
      setState(() {
        final userId = data['userId'];
        final position = LatLng(data['latitude'], data['longitude']);
        
        _markers[userId] = Marker(
          markerId: MarkerId(userId.toString()),
          position: position,
          infoWindow: InfoWindow(
            title: '${data['code']} - ${data['name']}',
            snippet: 'Son Güncelleme: ${DateTime.now().hour}:${DateTime.now().minute}',
          ),
          icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueOrange), // Turuncu İkon
        );
      });

      // Haritayı son gelen konuma odakla (İsteğe bağlı)
      // _mapController?.animateCamera(CameraUpdate.newLatLng(LatLng(data['latitude'], data['longitude'])));
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Personel Canlı Takip')),
      body: GoogleMap(
        initialCameraPosition: const CameraPosition(
          target: LatLng(38.4192, 27.1287), // İzmir (Örnek)
          zoom: 12,
        ),
        markers: _markers.values.toSet(),
        onMapCreated: (controller) => _mapController = controller,
        myLocationEnabled: false,
        mapType: MapType.normal,
      ),
    );
  }
}
