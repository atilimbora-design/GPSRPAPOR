import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../services/auth_service.dart';
import 'chat_screen.dart';

class AdminListScreen extends StatefulWidget {
  const AdminListScreen({super.key});

  @override
  State<AdminListScreen> createState() => _AdminListScreenState();
}

class _AdminListScreenState extends State<AdminListScreen> {
  List<dynamic> _admins = [];
  List<dynamic> _groups = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchAdminsAndGroups();
  }

  Future<void> _fetchAdminsAndGroups() async {
    setState(() => _isLoading = true);
    try {
      final authService = Provider.of<AuthService>(context, listen: false);
      final adminsResp = await http.get(
        Uri.parse('${AuthService.baseUrl}/api/admins'),
        headers: {'Authorization': 'Bearer ${authService.token}'},
      );
      final groupsResp = await http.get(
        Uri.parse('${AuthService.baseUrl}/api/groups'),
        headers: {'Authorization': 'Bearer ${authService.token}'},
      );

      if (adminsResp.statusCode == 200) {
        _admins = jsonDecode(adminsResp.body);
      }
      if (groupsResp.statusCode == 200) {
        _groups = jsonDecode(groupsResp.body);
      }
    } catch (_) {}
    if (mounted) setState(() => _isLoading = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Yönetici ve Gruplar'),
        backgroundColor: const Color(0xFF1E1E1E),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                const Text('Yöneticiler', style: TextStyle(color: Colors.white70, fontSize: 16)),
                const SizedBox(height: 8),
                ..._admins.map((admin) => ListTile(
                      leading: CircleAvatar(
                        backgroundColor: const Color(0xFF2C2C2C),
                        backgroundImage: admin['avatar'] != null ? NetworkImage(admin['avatar']) : null,
                        child: admin['avatar'] == null
                            ? const Icon(Icons.shield, color: Colors.white70)
                            : null,
                      ),
                      title: Text(admin['name'], style: const TextStyle(color: Colors.white)),
                      subtitle: Text(admin['personelCode'] ?? '', style: const TextStyle(color: Colors.white54)),
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => ChatScreen(
                              targetId: admin['id'].toString(),
                              targetName: admin['name'],
                            ),
                          ),
                        );
                      },
                    )),
                const Divider(color: Colors.white10, height: 32),
                const Text('Gruplar', style: TextStyle(color: Colors.white70, fontSize: 16)),
                const SizedBox(height: 8),
                if (_groups.isEmpty)
                  const Text('Grup yok', style: TextStyle(color: Colors.white54)),
                ..._groups.map((g) => ListTile(
                      leading: const Icon(Icons.group, color: Colors.blueAccent),
                      title: Text(g['name'], style: const TextStyle(color: Colors.white)),
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => ChatScreen(
                              targetId: 'group_${g['id']}',
                              targetName: g['name'],
                            ),
                          ),
                        );
                      },
                    )),
              ],
            ),
    );
  }
}
