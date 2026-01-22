import 'package:flutter/material.dart';
import 'chat_screen.dart';

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
      final response = await http.get(
        Uri.parse('${AuthService.baseUrl}/api/users'),
        headers: {'Authorization': 'Bearer ${authService.token}'}
      );

      if (response.statusCode == 200) {
        setState(() {
          _users = jsonDecode(response.body);
          _isLoading = false;
        });
      } else {
        setState(() => _isLoading = false);
      }
    } catch (e) {
      print('User fetch error: $e');
      setState(() => _isLoading = false);
    }
  }

  Future<void> _deleteUser(int id) async {
     // Implement API call
     // For safety, maybe ask user first. 
     // For now, just print.
     print('Delete user $id');
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
                  ElevatedButton.icon(
                    onPressed: () {
                        Navigator.push(
                           context,
                           MaterialPageRoute(
                             builder: (context) => const ChatScreen(
                               targetId: 'admin', // send to admin group logic
                               targetName: 'Yönetici Grubu',
                             ),
                           ),
                         );
                    },
                    icon: const Icon(Icons.group),
                    label: const Text('Grup Sohbeti'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.blue[800],
                      foregroundColor: Colors.white,
                    ),
                  ),
                  const SizedBox(width: 10),
                  ElevatedButton.icon(
                    onPressed: _showAddUserDialog,
                    icon: const Icon(Icons.add),
                    label: const Text('Yeni Personel Ekle'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFE65100),
                      foregroundColor: Colors.white,
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
                        leading: CircleAvatar(
                          backgroundColor: const Color(0xFFE65100).withOpacity(0.2),
                          backgroundImage: user['avatar'] != null ? NetworkImage(user['avatar']) : null,
                          child: user['avatar'] == null 
                            ? Text(
                                user['personelCode'] ?? '?',
                                style: const TextStyle(color: Color(0xFFE65100)),
                              )
                            : null,
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
                                     builder: (context) => ChatScreen(
                                       targetId: user['id'].toString(), 
                                       targetName: user['name'],
                                     ),
                                   ),
                                 );
                              },
                              tooltip: 'Mesaj Gönder',
                            ),
                            IconButton(
                              icon: const Icon(Icons.password, color: Colors.blueAccent),
                              onPressed: () => _showChangePasswordDialog(user),
                              tooltip: 'Şifre Değiştir',
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
      // Keep existing dialog logic but add API Integration later
      // For now ui only
     showDialog(
       context: context,
       builder: (context) => AlertDialog(
         backgroundColor: const Color(0xFF1E1E1E),
         title: const Text('Yeni Personel Ekle', style: TextStyle(color: Colors.white)),
         content: const Text("Coming Soon", style: TextStyle(color: Colors.white)),
          actions: [TextButton(onPressed: ()=>Navigator.pop(context), child: const Text('OK'))]
       )
     );
  }

  void _showChangePasswordDialog(Map<String, dynamic> user) {
     // Keep existing logic or dummy
     showDialog(
       context: context,
       builder: (context) => AlertDialog(
         backgroundColor: const Color(0xFF1E1E1E),
         title: Text('Şifre Değiştir: ${user['name']}', style: const TextStyle(color: Colors.white)),
         content: const Text("Coming Soon", style: TextStyle(color: Colors.white)),
         actions: [TextButton(onPressed: ()=>Navigator.pop(context), child: const Text('OK'))]
       )
     );
  }
}
