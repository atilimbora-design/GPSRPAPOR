import 'package:flutter/material.dart';
import 'admin_chat_panel_screen.dart';

import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:provider/provider.dart';
import '../services/auth_service.dart';

class AdminUsersScreen extends StatefulWidget {
  const AdminUsersScreen({super.key});

  @override
  State<AdminUsersScreen> createState() => _AdminUsersScreenState();
}

class _AdminUsersScreenState extends State<AdminUsersScreen> {
  List<dynamic> _users = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchUsers();
  }

  Future<void> _fetchUsers() async {
    try {
      final authService = Provider.of<AuthService>(context, listen: false);
      final uri = Uri.parse('${AuthService.baseUrl}/api/users')
          .replace(queryParameters: {'t': DateTime.now().millisecondsSinceEpoch.toString()});
      final response = await http.get(
        uri,
        headers: {'Authorization': 'Bearer ${authService.token}'}
      );

      if (response.statusCode == 200) {
        setState(() {
          _users = jsonDecode(response.body);
          _isLoading = false;
        });
      } else {
        setState(() => _isLoading = false);
        if (mounted) {
           ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Hata: ${response.statusCode} - Veri çekilemedi.')));
        }
      }
    } catch (e) {
      print('User fetch error: $e');
      setState(() => _isLoading = false);
      if (mounted) {
         ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Bağlantı Hatası: $e')));
      }
    }
  }

  Future<void> _deleteUser(int id) async {
     try {
       final authService = Provider.of<AuthService>(context, listen: false);
       final response = await http.delete(
         Uri.parse('${AuthService.baseUrl}/api/users/$id'),
         headers: {'Authorization': 'Bearer ${authService.token}'},
       );
       if (response.statusCode == 200) {
         await _fetchUsers();
       } else {
         if (mounted) {
           ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Silinemedi: ${response.statusCode}')));
         }
       }
     } catch (e) {
       if (mounted) {
         ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Hata: $e')));
       }
     }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Personel Yönetimi',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                ),
              ),
              Row(
                children: [
                  Flexible(
                    child: ElevatedButton.icon(
                      onPressed: _showAddUserDialog,
                      icon: const Icon(Icons.add, size: 18),
                      label: const Text('Ekle', maxLines: 1),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFE65100),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(horizontal: 10),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 20),
          Expanded(
            child: _isLoading 
              ? const Center(child: CircularProgressIndicator())
              : ListView.builder(
                  itemCount: _users.length,
                  itemBuilder: (context, index) {
                    final user = _users[index];
                    return Card(
                      color: Colors.white.withOpacity(0.05),
                      margin: const EdgeInsets.only(bottom: 10),
                      child: ListTile(
                        leading: _buildAvatarWithId(
                          id: user['personelCode'] ?? '?',
                          avatarUrl: user['avatar'],
                          size: 40,
                          isAdmin: user['role'] == 'admin',
                        ),
                        title: Text(
                          user['name'],
                          style: const TextStyle(color: Colors.white),
                        ),
                        subtitle: Text(
                          user['role'] ?? 'Personel',
                          style: const TextStyle(color: Colors.white54),
                        ),
                        trailing: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            IconButton(
                              icon: const Icon(Icons.chat, color: Colors.greenAccent),
                              onPressed: () {
                                 Navigator.push(
                                   context,
                                   MaterialPageRoute(
                                     builder: (context) => AdminChatPanelScreen(
                                       initialUserId: user['id'],
                                       initialUserName: user['name'],
                                     ),
                                   ),
                                 );
                              },
                              tooltip: 'Mesaj Gönder',
                            ),
                            IconButton(
                              icon: const Icon(Icons.password, color: Colors.blueAccent),
                              onPressed: () => _showEditUserDialog(user),
                              tooltip: 'Düzenle',
                            ),
                            if (user['role'] != 'admin')
                              IconButton(
                                icon: const Icon(Icons.delete, color: Colors.redAccent),
                                onPressed: () => _deleteUser(user['id']),
                                tooltip: 'Sil',
                              ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
          ),
        ],
      ),
    );
  }

  void _showAddUserDialog() {
     _showUserDialog();
  }

  void _showEditUserDialog(Map<String, dynamic> user) {
     _showUserDialog(editUser: user);
  }

  void _showUserDialog({Map<String, dynamic>? editUser}) {
    final codeController = TextEditingController(text: editUser?['personelCode'] ?? '');
    final nameController = TextEditingController(text: editUser?['name'] ?? '');
    final passwordController = TextEditingController();
    String role = editUser?['role'] ?? 'user';

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFF1E1E1E),
        title: Text(editUser == null ? 'Yeni Personel Ekle' : 'Personel Düzenle', style: const TextStyle(color: Colors.white)),
        content: SizedBox(
          width: 360,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: codeController,
                style: const TextStyle(color: Colors.white),
                decoration: const InputDecoration(labelText: 'Personel Kodu', labelStyle: TextStyle(color: Colors.white70)),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: nameController,
                style: const TextStyle(color: Colors.white),
                decoration: const InputDecoration(labelText: 'Ad Soyad', labelStyle: TextStyle(color: Colors.white70)),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: passwordController,
                style: const TextStyle(color: Colors.white),
                decoration: InputDecoration(
                  labelText: editUser == null ? 'Şifre' : 'Yeni Şifre (opsiyonel)',
                  labelStyle: const TextStyle(color: Colors.white70),
                ),
              ),
              const SizedBox(height: 8),
              DropdownButtonFormField<String>(
                value: role,
                dropdownColor: const Color(0xFF1E1E1E),
                decoration: const InputDecoration(labelText: 'Rol', labelStyle: TextStyle(color: Colors.white70)),
                items: const [
                  DropdownMenuItem(value: 'user', child: Text('Personel', style: TextStyle(color: Colors.white))),
                  DropdownMenuItem(value: 'admin', child: Text('Admin', style: TextStyle(color: Colors.white))),
                ],
                onChanged: (val) {
                  if (val != null) role = val;
                },
              ),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('İptal')),
          ElevatedButton(
            onPressed: () async {
              final code = codeController.text.trim();
              final name = nameController.text.trim();
              final pass = passwordController.text.trim();
              if (code.isEmpty || name.isEmpty || (editUser == null && pass.isEmpty)) {
                return;
              }
              if (editUser == null) {
                await _createUser(code, name, role, pass);
              } else {
                await _updateUser(editUser['id'], code, name, role, pass);
              }
              if (mounted) Navigator.pop(context);
            },
            child: const Text('Kaydet'),
          ),
        ],
      ),
    );
  }

  Future<void> _createUser(String code, String name, String role, String password) async {
    try {
      final authService = Provider.of<AuthService>(context, listen: false);
      final response = await http.post(
        Uri.parse('${AuthService.baseUrl}/api/users'),
        headers: {
          'Authorization': 'Bearer ${authService.token}',
          'Content-Type': 'application/json'
        },
        body: jsonEncode({
          'personelCode': code,
          'name': name,
          'role': role,
          'password': password,
        }),
      );
      if (response.statusCode == 200) {
        try {
          final created = jsonDecode(response.body);
          if (created is Map && created['id'] != null) {
            setState(() {
              _users = [
                created,
                ..._users.where((u) => u['id'] != created['id']),
              ];
            });
          }
        } catch (_) {}
        await _fetchUsers();
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Ekleme hatası: ${response.statusCode}')));
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Hata: $e')));
      }
    }
  }

  Future<void> _updateUser(int id, String code, String name, String role, String password) async {
    try {
      final authService = Provider.of<AuthService>(context, listen: false);
      final body = {
        'personelCode': code,
        'name': name,
        'role': role,
      };
      if (password.isNotEmpty) body['password'] = password;
      final response = await http.put(
        Uri.parse('${AuthService.baseUrl}/api/users/$id'),
        headers: {
          'Authorization': 'Bearer ${authService.token}',
          'Content-Type': 'application/json'
        },
        body: jsonEncode(body),
      );
      if (response.statusCode == 200) {
        await _fetchUsers();
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Güncelleme hatası: ${response.statusCode}')));
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Hata: $e')));
      }
    }
  }

  Widget _buildAvatarWithId({
    required String id,
    String? avatarUrl,
    double size = 40,
    bool isAdmin = false,
  }) {
    return Stack(
      alignment: Alignment.bottomCenter,
      children: [
        CircleAvatar(
          radius: size / 2,
          backgroundColor: const Color(0xFF2C2C2C),
          backgroundImage: avatarUrl != null ? NetworkImage(avatarUrl) : null,
          child: avatarUrl == null
              ? Icon(isAdmin ? Icons.shield : Icons.person, color: Colors.white70)
              : null,
        ),
        if (!isAdmin)
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
