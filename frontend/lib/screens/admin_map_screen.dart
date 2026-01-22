import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:provider/provider.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'dart:async';
import '../services/socket_service.dart';
import '../services/auth_service.dart';
import 'chat_screen.dart';

class AdminMapScreen extends StatefulWidget {
  const AdminMapScreen({super.key});

  @override
  State<AdminMapScreen> createState() => _AdminMapScreenState();
}

class _AdminMapScreenState extends State<AdminMapScreen> {
  final MapController _mapController = MapController();
  
  // Canlı Konum Verileri (UserID -> Data)
  final Map<int, dynamic> _userLocations = {};
  
  // Tüm Kullanıcı Listesi (Statik + Durum)
  List<dynamic> _allUsers = [];
  bool _isLoadingUsers = true;

  // Harita Merkezi (İzmir)
  static const _initialLat = 38.4192;
  static const _initialLng = 27.1287;
  double _currentZoom = 12.0;

  @override
  void initState() {
    super.initState();
    _fetchUsers();
    
    // Socket Dinleme
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final socketService = Provider.of<SocketService>(context, listen: false);
      socketService.socket?.on('locationUpdate', _handleLocationUpdate);
    });
  }
  
  Future<void> _fetchUsers() async {
    try {
      // AuthService'deki baseUrl'i kullanıyoruz.
      // DİKKAT: AuthService.baseUrl static ise direkt erişilir.
      // Değilse Provider ile alınabilir ama static tanımlamıştık.
      final response = await http.get(Uri.parse('${AuthService.baseUrl}/api/users'));
      if (response.statusCode == 200) {
        final List<dynamic> users = jsonDecode(response.body);
        // Sadece 'user' rolündekileri filtrele (Adminleri haritada görmeye gerek var mı? Personel takibi ise sadece user)
        // Kullanıcı isteği: "Tüm personel". Adminler hariç olabilir.
        setState(() {
          // DEBUG: Show ALL users to fix visibility issue
          _allUsers = users; 
          _isLoadingUsers = false;
        });

        // Offline / Son Konum Verilerini Yükle
        for (var u in _allUsers) {
           if (u['lastLat'] != null && u['lastLng'] != null) {
              final userId = u['id'];
              // Eğer socketten güncel veri gelmediyse, DB verisini koy
              if (!_userLocations.containsKey(userId)) {
                  setState(() {
                    _userLocations[userId] = {
                      'id': userId,
                      'userId': userId,
                      'name': u['name'],
                      'code': u['personelCode'] ?? '', // Add code
                      'lat': u['lastLat'],
                      'lng': u['lastLng'],
                      'speed': u['speed'] ?? 0.0,
                      'battery': u['battery'] ?? 0,
                      'timestamp': u['lastSeen'] ?? DateTime.now().toIso8601String()
                    };
                  });
              }
           }
        }

      }
    } catch (e) {
      print('Kullanıcı listesi hatası: $e');
      setState(() => _isLoadingUsers = false);
    }
  }

  void _handleLocationUpdate(dynamic data) {
    if (!mounted) return;
    print("HARİTA: ${data['name']} konum güncelledi.");
    setState(() {
      final userId = data['userId'];
      _userLocations[userId] = data;
    });
  }

  void _centerOnUser(int userId) {
    final location = _userLocations[userId];
    if (location != null) {
      _mapController.move(LatLng(location['lat'], location['lng']), 16);
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Bu kullanıcının aktif konumu yok.')),
      );
    }
  }

  bool _isOnline(dynamic user) {
    // Location map'te var mı?
    final userId = user['id'];
    final loc = _userLocations[userId];
    if (loc == null) return false;
    
    // Timestamp kontrolü (Son 5 dakika)
    final timestamp = DateTime.tryParse(loc['timestamp'] ?? '');
    if (timestamp == null) return false;
    
    final diff = DateTime.now().difference(timestamp);
    return diff.inMinutes < 5;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Column(
        children: [
          // ÜST KISIM: HARİTA
          Expanded(
            flex: 2, // Harita 2 birim
            child: Stack(
              children: [
                FlutterMap(
                  mapController: _mapController,
                  options: MapOptions(
                    initialCenter: const LatLng(_initialLat, _initialLng),
                    initialZoom: _currentZoom,
                  ),
                  children: [
                    TileLayer(
                      urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                      userAgentPackageName: 'com.atilimgida.gpsrapor',
                    ),
                    MarkerLayer(
                      markers: _userLocations.values.map((loc) {
                        final userId = loc['userId'] ?? loc['id'];
                        final fullUser = _allUsers.firstWhere((u) => u['id'] == userId, orElse: () => {});
                        final avatarUrl = loc['avatar'] ?? fullUser['avatar'];
                        
                        // Timestamp check for online status color
                        bool isOnline = false;
                        final date = DateTime.tryParse(loc['timestamp'] ?? '');
                        if (date != null) {
                           isOnline = DateTime.now().difference(date).inMinutes < 5;
                        }

                        return Marker(
                          key: Key(userId.toString()),
                          point: LatLng(loc['lat'], loc['lng']),
                          width: 60,
                          height: 80,
                          child: GestureDetector(
                            onTap: () => _showUserDetail(loc),
                            child: Column(
                              children: [
                                // Avatar
                                Container(
                                  decoration: BoxDecoration(
                                    shape: BoxShape.circle,
                                    border: Border.all(
                                      color: isOnline ? Colors.greenAccent : Colors.red, 
                                      width: 2,
                                    ),
                                    boxShadow: const [BoxShadow(color: Colors.black45, blurRadius: 4)]
                                  ),
                                  child: CircleAvatar(
                                    radius: 20,
                                    backgroundColor: const Color(0xFFE65100),
                                    backgroundImage: avatarUrl != null ? NetworkImage(avatarUrl) : null,
                                    child: avatarUrl == null ? const Icon(Icons.person, color: Colors.white, size: 24) : null,
                                  ),
                                ),
                                // İsim Etiketi
                                Container(
                                  margin: const EdgeInsets.only(top: 4),
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: Colors.black87, // Dark background
                                    borderRadius: BorderRadius.circular(12),
                                    boxShadow: const [BoxShadow(color: Colors.white24, blurRadius: 2)],
                                  ),
                                  child: Text(
                                    loc['name'] ?? 'Bilinmiyor',
                                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white),
                                    overflow: TextOverflow.visible,
                                    textAlign: TextAlign.center,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                  ],
                ),
                
                // Zoom Kontrolleri
                Positioned(
                  right: 10,
                  bottom: 20,
                  child: Column(
                    children: [
                      FloatingActionButton.small(
                        heroTag: "zoom_in",
                        backgroundColor: Colors.white,
                        child: const Icon(Icons.add, color: Colors.black),
                        onPressed: () {
                          setState(() {
                            _currentZoom++;
                            _mapController.move(_mapController.camera.center, _currentZoom);
                          });
                        },
                      ),
                      const SizedBox(height: 8),
                      FloatingActionButton.small(
                        heroTag: "zoom_out",
                        backgroundColor: Colors.white,
                        child: const Icon(Icons.remove, color: Colors.black),
                        onPressed: () {
                          setState(() {
                            _currentZoom--;
                            _mapController.move(_mapController.camera.center, _currentZoom);
                          });
                        },
                      ),
                      const SizedBox(height: 8),
                      FloatingActionButton.small(
                        heroTag: "center_map",
                        backgroundColor: const Color(0xFFE65100),
                        child: const Icon(Icons.center_focus_strong, color: Colors.white),
                        onPressed: () {
                          _mapController.move(const LatLng(_initialLat, _initialLng), 12);
                        },
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          
          // ALT KISIM: PERSONEL LİSTESİ
          Container(
            height: 250, // Sabit yükseklik veya Expanded flex: 1
            color: const Color(0xFF1E1E1E),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.all(12.0),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Personel Listesi', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
                      Text('${_allUsers.length} Personel', style: const TextStyle(color: Colors.white54)),
                    ],
                  ),
                ),
                Expanded(
                  child: _isLoadingUsers 
                    ? const Center(child: CircularProgressIndicator())
                    : ListView.builder(
                        itemCount: _allUsers.length,
                        itemBuilder: (context, index) {
                          final user = _allUsers[index];
                          final userId = user['id'];
                          final loc = _userLocations[userId]; // Canlı veri
                          
                          // Online kontrolü
                          bool isOnline = false;
                          if (loc != null) {
                             final ts = DateTime.tryParse(loc['timestamp'] ?? '');
                             if (ts != null) {
                               isOnline = DateTime.now().difference(ts).inMinutes < 5;
                             }
                          }

                          return ListTile(
                            onTap: () => _centerOnUser(userId),
                            leading: Stack(
                              children: [
                                CircleAvatar(
                                  backgroundColor: Colors.grey,
                                  backgroundImage: user['avatar'] != null ? NetworkImage(user['avatar']) : null,
                                  child: user['avatar'] == null ? const Icon(Icons.person, color: Colors.white) : null,
                                ),
                                Positioned(
                                  bottom: 0,
                                  right: 0,
                                  child: Container(
                                    width: 12,
                                    height: 12,
                                    decoration: BoxDecoration(
                                      color: isOnline ? Colors.greenAccent : Colors.redAccent,
                                      shape: BoxShape.circle,
                                      border: Border.all(color: const Color(0xFF1E1E1E), width: 2),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            title: Text(user['name'], style: const TextStyle(color: Colors.white)),
                            subtitle: loc != null 
                                ? Row(
                                    children: [
                                      Icon(Icons.speed, size: 14, color: Colors.orangeAccent),
                                      const SizedBox(width: 4),
                                      Text('${(loc['speed'] ?? 0).toStringAsFixed(1)} km/h', style: const TextStyle(color: Colors.white70, fontSize: 12)),
                                    ],
                                  )
                                : const Text('Veri yok / Offline', style: TextStyle(color: Colors.white24, fontSize: 12)),
                            trailing: IconButton(
                              icon: const Icon(Icons.chat_bubble_outline, color: Colors.blueAccent),
                              onPressed: () {
                                Navigator.push(context, MaterialPageRoute(builder: (_) => ChatScreen(
                                  targetId: userId.toString(), 
                                  targetName: user['name']
                                )));
                              },
                            ),
                          );
                        },
                      ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _showUserDetail(dynamic locData) {
     final date = DateTime.tryParse(locData['timestamp'] ?? '')?.toLocal();
     final timeStr = date != null ? '${date.hour}:${date.minute}' : 'Bilinmiyor';
     
     // Find full user info for avatar
     final userId = locData['userId'] ?? locData['id']; // List click sends DB user, Map click sends loc data
     final fullUser = _allUsers.firstWhere((u) => u['id'] == userId, orElse: () => {});
     final avatarUrl = fullUser['avatar'];

     showModalBottomSheet(
       context: context,
       backgroundColor: const Color(0xFF1E1E1E),
       shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
       builder: (context) => Container(
         padding: const EdgeInsets.all(20),
         child: Column(
           mainAxisSize: MainAxisSize.min,
           children: [
             CircleAvatar(
               radius: 40,
               backgroundColor: const Color(0xFFE65100),
               backgroundImage: avatarUrl != null ? NetworkImage(avatarUrl) : null,
               child: avatarUrl == null ? const Icon(Icons.person, size: 40, color: Colors.white) : null,
             ),
             const SizedBox(height: 10),
             Text(locData['name'] ?? 'İsimsiz', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.white)),
             Text('Son Güncelleme: $timeStr', style: const TextStyle(color: Colors.white54)),
             const SizedBox(height: 20),
             Row(
               mainAxisAlignment: MainAxisAlignment.spaceEvenly,
               children: [
                 _statCard(Icons.speed, '${(locData['speed'] ?? 0).toStringAsFixed(1)}', 'km/h', Colors.orange),
                 _statCard(Icons.battery_full, '${locData['battery'] ?? 0}', '%', Colors.green),
               ],
             ),
             const SizedBox(height: 20),
             SizedBox(
               width: double.infinity,
               child: ElevatedButton.icon(
                 onPressed: () {
                   Navigator.pop(context); // Close modal
                   Navigator.push(context, MaterialPageRoute(builder: (_) => ChatScreen(
                     targetId: userId.toString(), 
                     targetName: locData['name'] ?? 'Personel'
                   )));
                 },
                 icon: const Icon(Icons.chat),
                 label: const Text('Mesaj Gönder'),
                 style: ElevatedButton.styleFrom(backgroundColor: Colors.blueAccent),
               ),
             )
           ],
         ),
       ),
     );
  }

  Widget _statCard(IconData icon, String value, String unit, Color color) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white10,
        borderRadius: BorderRadius.circular(15),
      ),
      child: Column(
        children: [
          Icon(icon, color: color, size: 30),
          const SizedBox(height: 8),
          Text(value, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.white)),
          Text(unit, style: const TextStyle(color: Colors.white54)),
        ],
      ),
    );
  }
}
