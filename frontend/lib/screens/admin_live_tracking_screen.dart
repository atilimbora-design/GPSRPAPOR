import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../models/location_update.dart';
import '../providers/device_location_provider.dart';
import '../services/auth_service.dart';
import '../services/socket_service.dart';
import '../widgets/live_tracking_map_osm.dart';

class AdminLiveTrackingScreen extends StatefulWidget {
  const AdminLiveTrackingScreen({super.key});

  @override
  State<AdminLiveTrackingScreen> createState() => _AdminLiveTrackingScreenState();
}

class _AdminLiveTrackingScreenState extends State<AdminLiveTrackingScreen> {
  final DeviceLocationProvider _provider = DeviceLocationProvider();
  final List<dynamic> _users = [];
  bool _isLoadingUsers = true;
  int? _selectedUserId;

  @override
  void initState() {
    super.initState();
    _fetchUsers();
    _ensureSocketConnected();
    _listenLocations();
  }

  @override
  void dispose() {
    final socket = Provider.of<SocketService>(context, listen: false).socket;
    socket?.off('locationUpdate', _onLocationUpdate);
    _provider.dispose();
    super.dispose();
  }

  void _ensureSocketConnected() {
    final authService = Provider.of<AuthService>(context, listen: false);
    final socketService = Provider.of<SocketService>(context, listen: false);
    final token = authService.token;
    if (token != null) {
      socketService.connect(AuthService.baseUrl, token);
    }
  }

  void _listenLocations() {
    final socket = Provider.of<SocketService>(context, listen: false).socket;
    socket?.on('locationUpdate', _onLocationUpdate);
  }

  void _onLocationUpdate(dynamic data) {
    if (data == null) return;
    final userId = data['userId'] ?? data['id'];
    if (userId == null) return;

    final update = LocationUpdate(
      lat: (data['lat'] as num).toDouble(),
      lng: (data['lng'] as num).toDouble(),
      bearing: data['bearing'] != null ? (data['bearing'] as num).toDouble() : null,
      timestamp: DateTime.tryParse(data['timestamp']?.toString() ?? '') ?? DateTime.now(),
      deviceId: userId.toString(),
    );
    _provider.addUpdate(update);
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
        setState(() {
          _users.clear();
          _users.addAll(users.where((u) => u['role'] != 'admin'));
          _isLoadingUsers = false;
        });
        if (_users.isNotEmpty && _selectedUserId == null) {
          setState(() {
            _selectedUserId = _users.first['id'];
          });
        }
      } else {
        setState(() => _isLoadingUsers = false);
      }
    } catch (e) {
      setState(() => _isLoadingUsers = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 280,
          color: const Color(0xFF1E1E1E),
          child: Column(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                color: const Color(0xFF2C2C2C),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Cihazlar',
                      style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                    IconButton(
                      icon: const Icon(Icons.refresh, color: Colors.white70),
                      onPressed: _fetchUsers,
                    ),
                  ],
                ),
              ),
              Expanded(
                child: _isLoadingUsers
                    ? const Center(child: CircularProgressIndicator())
                    : ListView.builder(
                        itemCount: _users.length,
                        itemBuilder: (context, index) {
                          final user = _users[index];
                          final isSelected = user['id'] == _selectedUserId;
                          return ListTile(
                            selected: isSelected,
                            selectedTileColor: const Color(0xFFE65100).withOpacity(0.3),
                            leading: _buildAvatarWithId(
                              id: user['personelCode'] ?? '?',
                              avatarUrl: user['avatar'],
                              size: 40,
                            ),
                            title: Text(user['name'], style: const TextStyle(color: Colors.white)),
                            onTap: () {
                              setState(() {
                                _selectedUserId = user['id'];
                              });
                            },
                          );
                        },
                      ),
              ),
            ],
          ),
        ),
        Expanded(
          child: _selectedUserId == null
              ? const Center(
                  child: Text('Takip için cihaz seçin', style: TextStyle(color: Colors.white54)),
                )
              : Builder(
                  builder: (context) {
                    final selected = _users.firstWhere((u) => u['id'] == _selectedUserId, orElse: () => null);
                    return LiveTrackingMapOsm(
                      provider: _provider,
                      deviceId: _selectedUserId!.toString(),
                      markerAvatarUrl: selected == null ? null : selected['avatar'],
                      markerLabel: selected == null ? '' : (selected['personelCode'] ?? ''),
                    );
                  },
                ),
        ),
      ],
    );
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
}
