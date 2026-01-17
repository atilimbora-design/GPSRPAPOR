import 'package:flutter/material.dart';
import 'chat_screen.dart';

class AdminUsersScreen extends StatefulWidget {
  const AdminUsersScreen({super.key});

  @override
  State<AdminUsersScreen> createState() => _AdminUsersScreenState();
}

class _AdminUsersScreenState extends State<AdminUsersScreen> {
  // Mock data for now
  final List<Map<String, dynamic>> _users = [
    {'code': '01', 'name': 'Dinçer Sezan', 'role': 'Personel', 'id': 1}, // Added IDs for testing
    {'code': '02', 'name': 'Ferhat Öztaş', 'role': 'Personel', 'id': 2},
    {'code': 'admin', 'name': 'Yönetici', 'role': 'Admin', 'id': 99},
  ];

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
                               targetId: 'admins', // Or 'group_general'
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
            child: ListView.builder(
              itemCount: _users.length,
              itemBuilder: (context, index) {
                final user = _users[index];
                return Card(
                  color: Colors.white.withOpacity(0.05),
                  margin: const EdgeInsets.only(bottom: 10),
                  child: ListTile(
                    leading: CircleAvatar(
                      backgroundColor: const Color(0xFFE65100).withOpacity(0.2),
                      child: Text(
                        user['code'],
                        style: const TextStyle(color: Color(0xFFE65100)),
                      ),
                    ),
                    title: Text(
                      user['name'],
                      style: const TextStyle(color: Colors.white),
                    ),
                    subtitle: Text(
                      user['role'],
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
                                   targetId: user['id']?.toString() ?? user['code'], // Use ID if available
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
                        if (user['code'] != 'admin')
                          IconButton(
                            icon: const Icon(Icons.delete, color: Colors.redAccent),
                            onPressed: () {
                              // Silme işlemi
                            },
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
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFF1E1E1E),
        title: const Text('Yeni Personel Ekle', style: TextStyle(color: Colors.white)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              style: const TextStyle(color: Colors.white),
              decoration: const InputDecoration(
                labelText: 'Ad Soyad',
                labelStyle: TextStyle(color: Colors.white70),
                enabledBorder: UnderlineInputBorder(borderSide: BorderSide(color: Colors.white30)),
              ),
            ),
            const SizedBox(height: 10),
            TextField(
              style: const TextStyle(color: Colors.white),
              decoration: const InputDecoration(
                labelText: 'Personel Kodu (ID)',
                labelStyle: TextStyle(color: Colors.white70),
                enabledBorder: UnderlineInputBorder(borderSide: BorderSide(color: Colors.white30)),
              ),
            ),
            const SizedBox(height: 10),
            TextField(
              obscureText: true,
              style: const TextStyle(color: Colors.white),
              decoration: const InputDecoration(
                labelText: 'Şifre',
                labelStyle: TextStyle(color: Colors.white70),
                enabledBorder: UnderlineInputBorder(borderSide: BorderSide(color: Colors.white30)),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('İptal'),
          ),
          ElevatedButton(
            onPressed: () {
              // Kayıt işlemi
              Navigator.pop(context);
            },
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFE65100)),
            child: const Text('Kaydet'),
          ),
        ],
      ),
    );
  }

  void _showChangePasswordDialog(Map<String, dynamic> user) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFF1E1E1E),
        title: Text('Şifre Değiştir: ${user['name']}', style: const TextStyle(color: Colors.white)),
        content: TextField(
          obscureText: true,
          style: const TextStyle(color: Colors.white),
          decoration: const InputDecoration(
            labelText: 'Yeni Şifre',
            labelStyle: TextStyle(color: Colors.white70),
            enabledBorder: UnderlineInputBorder(borderSide: BorderSide(color: Colors.white30)),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('İptal'),
          ),
          ElevatedButton(
            onPressed: () {
              // Güncelleme işlemi
              Navigator.pop(context);
            },
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFE65100)),
            child: const Text('Güncelle'),
          ),
        ],
      ),
    );
  }
}
