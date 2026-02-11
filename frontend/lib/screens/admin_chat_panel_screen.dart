import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:intl/intl.dart';
import 'dart:async';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import '../services/auth_service.dart';
import '../services/socket_service.dart';
import 'chat_screen.dart';

class AdminChatPanelScreen extends StatefulWidget {
  final int? initialUserId;
  final String? initialUserName;

  const AdminChatPanelScreen({super.key, this.initialUserId, this.initialUserName});

  @override
  State<AdminChatPanelScreen> createState() => _AdminChatPanelScreenState();
}

class _AdminChatPanelScreenState extends State<AdminChatPanelScreen> {
  List<dynamic> _users = [];
  List<dynamic> _groups = [];
  int? _selectedUserId;
  String _selectedUserName = '';
  List<Map<String, dynamic>> _messages = [];
  bool _isLoadingUsers = true;
  bool _isLoadingMessages = false;
  bool _isLoadingGroups = true;
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final TextEditingController _searchController = TextEditingController();
  Timer? _refreshTimer;
  FlutterLocalNotificationsPlugin? _notifications;

  @override
  void initState() {
    super.initState();
    _fetchUsers();
    _fetchGroups();
    _ensureSocketConnected();
    _initNotifications();
    
    final socketService = Provider.of<SocketService>(context, listen: false);
    socketService.socket?.on('newMessage', _handleNewMessage);

    _refreshTimer = Timer.periodic(const Duration(seconds: 30), (_) {
      _fetchUsers();
      _fetchGroups();
    });
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _initNotifications() async {
    _notifications = FlutterLocalNotificationsPlugin();
    const android = AndroidInitializationSettings('@mipmap/ic_launcher');
    const ios = DarwinInitializationSettings();
    const initSettings = InitializationSettings(android: android, iOS: ios);
    await _notifications?.initialize(initSettings);
  }

  void _handleNewMessage(dynamic data) {
    if (!mounted) return;
    // Eğer seçili kullanıcı ile ilgiliyse ekle
    if (_selectedUserId != null) {
      final selectedIdStr = _selectedUserId.toString();
      final fromId = data['from'].toString();
      final toId = data['to'].toString();
      
      // Mesaj bana mı (Admin'e) geldi sender=selectedUser? VEYA ben mi gönderdim to=selectedUser?
      // Not: Admin panelindeyiz. My ID = Admin ID.
      // Mesajın 'to' alanı 'admin' veya 'admins' olabilir.
      
      bool relevant = false;
      
      if (fromId == selectedIdStr) relevant = true; // Karşıdan geldi
      // Benim gönderdiğim mesajın sockettek yansıması (kendi ID'm backendde ne ise)
      // Socket 'messageSent' onayı ile de ekleyebiliriz ama backend 'newMessage' brodcast ediyor olabilir.
      // Burada basit mantık: Eğer mesajın 'to' su seçili kullanıcı ise
      if (toId == selectedIdStr) relevant = true; // Ben gönderdim
      
      // Admin grup mesajları vb için daha karmaşık mantık gerekir ama şimdilik birebir
      
      if (relevant) {
        setState(() {
           if (!_messages.any((m) => m['id'] == data['id'])) {
             _messages.add(data);
             _scrollToBottom();
           }
        });
      }
    }

    // Desktop notification for new messages
    final fromId = data['from']?.toString();
    final isSelected = _selectedUserId?.toString() == fromId;
    if (!isSelected && fromId != null && data['message'] != null) {
      _notifications?.show(
        DateTime.now().millisecondsSinceEpoch ~/ 1000,
        data['fromName']?.toString() ?? 'Yeni Mesaj',
        data['message']?.toString(),
        const NotificationDetails(
          android: AndroidNotificationDetails(
            'gpsrapor_messages',
            'Mesaj Bildirimleri',
            importance: Importance.high,
            priority: Priority.high,
          ),
          iOS: DarwinNotificationDetails(),
        ),
      );
    }
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
        final authService = Provider.of<AuthService>(context, listen: false);
        final myId = authService.user?['id'];
        final List<dynamic> users = jsonDecode(response.body);
        setState(() {
          _users = users.where((u) => u['id'] != myId).toList();
          _isLoadingUsers = false;
        });
        if (widget.initialUserId != null) {
          dynamic initial;
          try {
            initial = _users.firstWhere((u) => u['id'] == widget.initialUserId);
          } catch (_) {
            initial = null;
          }
          if (initial != null) {
            _selectUser(initial['id'], initial['name']);
          } else if (widget.initialUserName != null) {
            _selectUser(widget.initialUserId!, widget.initialUserName!);
          }
        }
      }
    } catch (e) {
      print('Kullanıcı listesi hatası: $e');
      setState(() => _isLoadingUsers = false);
    }
  }

  Future<void> _fetchGroups() async {
    try {
      final authService = Provider.of<AuthService>(context, listen: false);
      final response = await http.get(
        Uri.parse('${AuthService.baseUrl}/api/groups'),
        headers: {'Authorization': 'Bearer ${authService.token}'},
      );
      if (response.statusCode == 200) {
        setState(() {
          _groups = jsonDecode(response.body);
          _isLoadingGroups = false;
        });
      } else {
        setState(() => _isLoadingGroups = false);
      }
    } catch (e) {
      setState(() => _isLoadingGroups = false);
    }
  }

  Future<void> _createGroup() async {
    final nameController = TextEditingController();
    final selected = <int>{};

    await showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) => AlertDialog(
        backgroundColor: const Color(0xFF1E1E1E),
        title: const Text('Yeni Grup', style: TextStyle(color: Colors.white)),
        content: SizedBox(
          width: 420,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: nameController,
                style: const TextStyle(color: Colors.white),
                decoration: const InputDecoration(labelText: 'Grup Adı', labelStyle: TextStyle(color: Colors.white70)),
              ),
              const SizedBox(height: 12),
              SizedBox(
                height: 320,
                child: ListView.builder(
                  itemCount: _users.length,
                  itemBuilder: (context, index) {
                    final user = _users[index];
                    final id = user['id'] as int;
                    return CheckboxListTile(
                      value: selected.contains(id),
                      onChanged: (val) {
                        if (val == true) {
                          selected.add(id);
                        } else {
                          selected.remove(id);
                        }
                        setModalState(() {});
                      },
                      title: Text(
                        '${user['name']} (${user['personelCode']})',
                        style: const TextStyle(color: Colors.white),
                      ),
                      controlAffinity: ListTileControlAffinity.leading,
                    );
                  },
                ),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('İptal')),
          ElevatedButton(
            onPressed: () async {
              final name = nameController.text.trim();
              if (name.isEmpty || selected.isEmpty) return;
              await _saveGroup(name, selected.toList());
              if (mounted) Navigator.pop(context);
            },
            child: const Text('Kaydet'),
          ),
        ],
      ),
      ),
    );
  }

  Future<void> _saveGroup(String name, List<int> memberIds) async {
    try {
      final authService = Provider.of<AuthService>(context, listen: false);
      final response = await http.post(
        Uri.parse('${AuthService.baseUrl}/api/groups'),
        headers: {
          'Authorization': 'Bearer ${authService.token}',
          'Content-Type': 'application/json'
        },
        body: jsonEncode({'name': name, 'memberIds': memberIds}),
      );
      if (response.statusCode == 200) {
        await _fetchGroups();
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Grup oluşturulamadı: ${response.statusCode}')));
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Hata: $e')));
      }
    }
  }

  void _ensureSocketConnected() {
    final authService = Provider.of<AuthService>(context, listen: false);
    final socketService = Provider.of<SocketService>(context, listen: false);
    final token = authService.token;
    if (token != null) {
      socketService.connect(AuthService.baseUrl, token);
    }
  }

  Future<void> _loadMessages(int userId) async {
    setState(() {
      _isLoadingMessages = true;
      _messages = [];
    });

    try {
      final authService = Provider.of<AuthService>(context, listen: false);
      final response = await http.get(
        Uri.parse('${AuthService.baseUrl}/api/messages/$userId'), 
        headers: {'Authorization': 'Bearer ${authService.token}'}
      );

      if (response.statusCode == 200) {
        final List<dynamic> data = jsonDecode(response.body);
        setState(() {
          _messages = data.map((e) => e as Map<String, dynamic>).toList();
          _isLoadingMessages = false;
        });
        _scrollToBottom();
      } else {
         // Hata durumu
         print('Mesaj yükleme hatası: Status ${response.statusCode}');
         setState(() => _isLoadingMessages = false);
      }
    } catch (e) {
      print('Mesaj yükleme hatası: $e');
      setState(() => _isLoadingMessages = false);
    }
  }

  void _selectUser(int userId, String userName) {
    setState(() {
      _selectedUserId = userId;
      _selectedUserName = userName;
    });
    _loadMessages(userId);
  }

  void _sendMessage() {
    if (_messageController.text.trim().isEmpty || _selectedUserId == null) return;

    final text = _messageController.text.trim();
    final socketService = Provider.of<SocketService>(context, listen: false);
    
    socketService.socket?.emit('sendMessage', {
      'to': _selectedUserId,
      'message': text,
      'type': 'text'
    });

    _messageController.clear();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
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

  @override
  Widget build(BuildContext context) {
    final search = _searchController.text.trim().toLowerCase();
    final filteredUsers = _users.where((u) {
      if (search.isEmpty) return true;
      final name = (u['name'] ?? '').toString().toLowerCase();
      final code = (u['personelCode'] ?? '').toString().toLowerCase();
      return name.contains(search) || code.contains(search);
    }).toList();
    final filteredGroups = _groups.where((g) {
      if (search.isEmpty) return true;
      final name = (g['name'] ?? '').toString().toLowerCase();
      return name.contains(search);
    }).toList();

    return Row(
      children: [
        // SOL PANEL: Kullanıcı Listesi
        Container(
          width: 300,
          color: Colors.white, // Açık Tema
          child: Column(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 15),
                decoration: BoxDecoration(
                  color: Colors.white,
                  border: Border(bottom: BorderSide(color: Colors.grey.shade200)),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Mesajlar', style: TextStyle(color: Colors.black87, fontSize: 18, fontWeight: FontWeight.bold)),
                    IconButton(
                        icon: const Icon(Icons.refresh, color: Colors.black54),
                        onPressed: () {
                          _fetchUsers();
                          _fetchGroups();
                        },
                        tooltip: 'Listeyi Yenile',
                    ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                child: TextField(
                  controller: _searchController,
                  onChanged: (_) => setState(() {}),
                  style: const TextStyle(color: Colors.black),
                  decoration: InputDecoration(
                    hintText: 'Ara (isim / kod)',
                    hintStyle: const TextStyle(color: Colors.grey),
                    filled: true,
                    fillColor: Colors.grey.shade100,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                    prefixIcon: const Icon(Icons.search, color: Colors.grey),
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(10.0),
                child: SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: _createGroup,
                    icon: const Icon(Icons.group_add),
                    label: const Text('Grup Oluştur'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.blueGrey.shade50,
                      foregroundColor: Colors.black87,
                      elevation: 0,
                    ),
                  ),
                ),
              ),
              Expanded(
                child: _isLoadingUsers 
                  ? const Center(child: CircularProgressIndicator()) 
                  : ListView(
                      children: [
                        if (_isLoadingGroups)
                          const ListTile(title: Text('Gruplar yükleniyor...', style: TextStyle(color: Colors.grey)))
                        else ...[
                          const Padding(
                            padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                            child: Text('Gruplar', style: TextStyle(color: Colors.grey, fontWeight: FontWeight.bold)),
                          ),
                          if (filteredGroups.isEmpty)
                            const ListTile(
                              title: Text('Grup yok', style: TextStyle(color: Colors.grey)),
                            ),
                          ...filteredGroups.map((g) => ListTile(
                                leading: Container(
                                  padding: const EdgeInsets.all(8),
                                  decoration: BoxDecoration(color: Colors.blue.shade50, shape: BoxShape.circle),
                                  child: const Icon(Icons.group, color: Colors.blue, size: 20),
                                ),
                                title: Text(g['name'], style: const TextStyle(color: Colors.black)),
                                onTap: () {
                                  Navigator.push(context, MaterialPageRoute(
                                    builder: (_) => ChatScreen(
                                      targetId: 'group_${g['id']}',
                                      targetName: g['name'],
                                    ),
                                  ));
                                },
                              )),
                          Divider(color: Colors.grey.shade200),
                        ],
                        const Padding(
                          padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                          child: Text('Personeller', style: TextStyle(color: Colors.grey, fontWeight: FontWeight.bold)),
                        ),
                        if (filteredUsers.isEmpty)
                          const ListTile(
                            title: Text('Kullanıcı bulunamadı', style: TextStyle(color: Colors.grey)),
                          ),
                        ...filteredUsers.map((user) {
                          final isSelected = user['id'] == _selectedUserId;
                          return ListTile(
                            tileColor: isSelected ? const Color(0xFFE65100).withOpacity(0.1) : null,
                            leading: _buildAvatarWithId(
                              id: user['personelCode'] ?? '?',
                              avatarUrl: user['avatar'],
                              size: 42,
                            ),
                            title: Text(user['name'], style: TextStyle(color: isSelected ? const Color(0xFFE65100) : Colors.black87, fontWeight: isSelected ? FontWeight.bold : FontWeight.normal)),
                            onTap: () => _selectUser(user['id'], user['name']),
                          );
                        })
                      ],
                    ),
              ),
            ],
          ),
        ),
        
        // SAĞ PANEL: Sohbet
        Expanded(
          child: Container(
            color: const Color(0xFFF5F7FA), // Açık Mavi-Gri Arka Plan
            child: _selectedUserId == null
              ? const Center(child: Text('Sohbet etmek için bir personel seçin', style: TextStyle(color: Colors.grey, fontSize: 16)))
              : Column(
                  children: [
                    // Header
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 15),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10)],
                      ),
                      child: Row(
                        children: [
                          _buildAvatarWithId(
                            id: _users.firstWhere((u)=>u['id']==_selectedUserId)['personelCode'],
                            avatarUrl: _users.firstWhere((u)=>u['id']==_selectedUserId)['avatar'],
                            size: 46,
                          ),
                          const SizedBox(width: 15),
                          Text(_selectedUserName, style: const TextStyle(color: Colors.black87, fontSize: 18, fontWeight: FontWeight.bold)),
                        ],
                      ),
                    ),
                    
                    // Mesajlar
                    Expanded(
                      child: _isLoadingMessages
                        ? const Center(child: CircularProgressIndicator())
                        : ListView.builder(
                            controller: _scrollController,
                            padding: const EdgeInsets.all(20),
                            itemCount: _messages.length,
                            itemBuilder: (context, index) {
                              final msg = _messages[index];
                              
                              // KULLANICI İSTEĞİ:
                              // Mesaj atan (Ben) -> SOLDA
                              // Karşıdan gelen -> SAĞDA
                              
                              // isIncome = Gelen mesaj (Karşıdan)
                              final isIncome = msg['from'].toString() == _selectedUserId.toString() || msg['senderId'].toString() == _selectedUserId.toString();
                              
                              // Normalde isIncome -> Left, ama kullanıcı ters istedi.
                              // isIncome (Gelen) -> Right
                              // !isIncome (Giden) -> Left
                              
                              return Align(
                                alignment: isIncome ? Alignment.centerRight : Alignment.centerLeft,
                                child: Container(
                                  margin: const EdgeInsets.symmetric(vertical: 5),
                                  padding: const EdgeInsets.all(12),
                                  constraints: const BoxConstraints(maxWidth: 400),
                                  decoration: BoxDecoration(
                                    // Gelen (Sağ) -> Turuncu, Giden (Sol) -> Beyaz
                                    color: isIncome ? const Color(0xFFE65100) : Colors.white,
                                    boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 5, offset: const Offset(0, 2))],
                                    borderRadius: BorderRadius.only(
                                      topLeft: const Radius.circular(12),
                                      topRight: const Radius.circular(12),
                                      bottomLeft: isIncome ? const Radius.circular(12) : Radius.zero,
                                      bottomRight: isIncome ? Radius.zero : const Radius.circular(12), // Ters köşe
                                    ),
                                    border: isIncome ? null : Border.all(color: Colors.grey.shade200),
                                  ),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      if (msg['type'] == 'image')
                                        ConstrainedBox(
                                          constraints: const BoxConstraints(
                                            maxWidth: 300,
                                            maxHeight: 300,
                                          ),
                                          child: ClipRRect(
                                            borderRadius: BorderRadius.circular(8),
                                            child: Image.memory(
                                              base64Decode(msg['message'] ?? msg['content']),
                                              fit: BoxFit.contain,
                                              gaplessPlayback: true,
                                            ),
                                          ),
                                        )
                                      else
                                        Text(msg['message'] ?? msg['content'] ?? '', style: TextStyle(color: isIncome ? Colors.white : Colors.black87, fontSize: 15)),
                                      
                                      const SizedBox(height: 5),
                                      Text(
                                        DateFormat('HH:mm').format(
                                          DateTime.parse(
                                            (msg['timestamp'] ?? msg['createdAt'] ?? DateTime.now().toIso8601String()).toString(),
                                          ).toLocal(),
                                        ),
                                        style: TextStyle(color: isIncome ? Colors.white70 : Colors.grey, fontSize: 10),
                                      ),
                                    ],
                                  ),
                                ),
                              );
                            },
                          ),
                    ),
                    
                    // Input Area
                    Container(
                      padding: const EdgeInsets.all(20),
                      color: Colors.white,
                      child: Row(
                        children: [
                          Expanded(
                            child: TextField(
                              controller: _messageController,
                              style: const TextStyle(color: Colors.black),
                              decoration: InputDecoration(
                                hintText: 'Bir mesaj yazın...',
                                hintStyle: const TextStyle(color: Colors.grey),
                                filled: true,
                                fillColor: Colors.grey.shade100,
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(30), borderSide: BorderSide.none),
                                contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 15),
                              ),
                              onSubmitted: (_) => _sendMessage(),
                            ),
                          ),
                          const SizedBox(width: 10),
                          CircleAvatar(
                            backgroundColor: const Color(0xFFE65100),
                            radius: 25,
                            child: IconButton(
                              icon: const Icon(Icons.send, color: Colors.white),
                              onPressed: _sendMessage,
                            ),
                          )
                        ],
                      ),
                    ),
                  ],
                ),
          ),
        ),
      ],
    );
  }
}
