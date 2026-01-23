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
import 'admin_chat_panel_screen.dart';

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
  int _depotFocusIndex = 0;

  final List<Map<String, dynamic>> _depots = [
    {
      'name': 'Merkez Depo',
      'lat': 38.438922448545654,
      'lng': 27.227150386506576,
    },
    {
      'name': 'Edremit Depo',
      'lat': 39.614296,
      'lng': 26.947969,
    },
    {
      'name': 'Bergama Depo',
      'lat': 39.116981926245465,
      'lng': 27.196848095354138,
    }
  ];

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
      final authService = Provider.of<AuthService>(context, listen: false);
      final response = await http.get(
        Uri.parse('${AuthService.baseUrl}/api/users'),
        headers: {'Authorization': 'Bearer ${authService.token}'},
      );
      if (response.statusCode == 200) {
        final List<dynamic> users = jsonDecode(response.body);
        // Sadece 'user' rolündekileri filtrele (Adminleri haritada görmeye gerek var mı? Personel takibi ise sadece user)
        // Kullanıcı isteği: "Tüm personel". Adminler hariç olabilir.
        setState(() {
          _allUsers = users.where((u) => u['role'] != 'admin').toList();
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

  void _cycleDepotFocus() {
    final depot = _depots[_depotFocusIndex];
    _mapController.move(LatLng(depot['lat'], depot['lng']), 14);
    setState(() {
      _depotFocusIndex = (_depotFocusIndex + 1) % _depots.length;
    });
  }

  bool _isOnlineFromTimestamp(String? timestamp) {
    final date = DateTime.tryParse(timestamp ?? '');
    if (date == null) return false;
    return DateTime.now().difference(date).inMinutes < 5;
  }

  List<dynamic> _sortedUsers() {
    final users = List<dynamic>.from(_allUsers);
    users.sort((a, b) {
      final aLoc = _userLocations[a['id']];
      final bLoc = _userLocations[b['id']];
      final aOnline = _isOnlineFromTimestamp(aLoc?['timestamp'] ?? a['lastSeen']);
      final bOnline = _isOnlineFromTimestamp(bLoc?['timestamp'] ?? b['lastSeen']);
      if (aOnline != bOnline) return aOnline ? -1 : 1;
      return (a['name'] ?? '').toString().compareTo((b['name'] ?? '').toString());
    });
    return users;
  }

  Widget _buildAvatarWithId({
    required String id,
    String? avatarUrl,
    double size = 40,
  }) {
    return Stack(
      alignment: Alignment.bottomCenter,
      children: [
        CircleAvatar(
          radius: size / 2,
          backgroundColor: const Color(0xFF2C2C2C),
          backgroundImage: avatarUrl != null ? NetworkImage(avatarUrl) : null,
          child: avatarUrl == null
              ? const Icon(Icons.person, color: Colors.white70)
              : null,
        ),
        Positioned(
          bottom: -2,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            decoration: BoxDecoration(
              color: Colors.black.withOpacity(0.6),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Text(
              id,
              style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
            ),
          ),
        ),
      ],
    );
  }

  String _formatLastSeen(dynamic lastSeen, dynamic lastLogout) {
    final seen = DateTime.tryParse(lastSeen?.toString() ?? '');
    final logout = DateTime.tryParse(lastLogout?.toString() ?? '');

    if (logout != null && (seen == null || logout.isAfter(seen))) {
      final local = logout.toLocal();
      final hh = local.hour.toString().padLeft(2, '0');
      final mm = local.minute.toString().padLeft(2, '0');
      return 'Çıkış yapıldı: ${local.year}-${local.month.toString().padLeft(2, '0')}-${local.day.toString().padLeft(2, '0')} $hh:$mm';
    }

    if (seen == null) return 'Veri yok / Offline';
    final local = seen.toLocal();
    final hh = local.hour.toString().padLeft(2, '0');
    final mm = local.minute.toString().padLeft(2, '0');
    return 'Son görüldü: ${local.year}-${local.month.toString().padLeft(2, '0')}-${local.day.toString().padLeft(2, '0')} $hh:$mm';
  }

  @override
  Widget build(BuildContext context) {
    final sortedUsers = _sortedUsers();
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
                    CircleLayer(
                      circles: _depots.map((d) {
                        return CircleMarker(
                          point: LatLng(d['lat'], d['lng']),
                          radius: 200,
                          color: Colors.orange.withOpacity(0.15),
                          borderStrokeWidth: 2,
                          borderColor: Colors.orangeAccent,
                        );
                      }).toList(),
                    ),
                    MarkerLayer(
                      markers: [
                        ..._depots.map((d) => Marker(
                              point: LatLng(d['lat'], d['lng']),
                              width: 140,
                              height: 60,
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                                decoration: BoxDecoration(
                                  color: Colors.black87,
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(color: Colors.orangeAccent, width: 1),
                                ),
                                child: Text(
                                  d['name'],
                                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                                  textAlign: TextAlign.center,
                                ),
                              ),
                            )),
                        ..._userLocations.values.map((loc) {
                        final userId = loc['userId'] ?? loc['id'];
                        final fullUser = _allUsers.firstWhere((u) => u['id'] == userId, orElse: () => {});
                        final avatarUrl = loc['avatar'] ?? fullUser['avatar'];
                        
                        // Timestamp check for online status color
                        bool isOnline = _isOnlineFromTimestamp(loc['timestamp']);

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
                                  child: _buildAvatarWithId(
                                    id: fullUser['personelCode']?.toString() ?? '',
                                    avatarUrl: avatarUrl,
                                    size: 40,
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
                      ],
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
                          _cycleDepotFocus();
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
                        itemCount: sortedUsers.length,
                        itemBuilder: (context, index) {
                          final user = sortedUsers[index];
                          final userId = user['id'];
                          final loc = _userLocations[userId]; // Canlı veri
                          
                          // Online kontrolü
                          final isOnline = _isOnlineFromTimestamp(loc?['timestamp'] ?? user['lastSeen']);

                          return ListTile(
                            onTap: () => _centerOnUser(userId),
                            leading: Stack(
                              children: [
                                _buildAvatarWithId(
                                  id: user['personelCode']?.toString() ?? '',
                                  avatarUrl: user['avatar'],
                                  size: 40,
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
                                      const Icon(Icons.speed, size: 14, color: Colors.orangeAccent),
                                      const SizedBox(width: 4),
                                      Text('${(loc['speed'] ?? 0).toStringAsFixed(1)} km/h', style: const TextStyle(color: Colors.white70, fontSize: 12)),
                                    ],
                                  )
                                : Text(
                                    _formatLastSeen(user['lastSeen'], user['lastLogout']),
                                    style: const TextStyle(color: Colors.white24, fontSize: 12),
                                  ),
                            trailing: IconButton(
                              icon: const Icon(Icons.chat_bubble_outline, color: Colors.blueAccent),
                              onPressed: () {
                                Navigator.push(context, MaterialPageRoute(
                                  builder: (_) => AdminChatPanelScreen(
                                    initialUserId: userId,
                                    initialUserName: user['name'],
                                  ),
                                ));
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
