import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:intl/intl.dart';
import '../services/auth_service.dart';
import '../services/socket_service.dart';

class AdminChatPanelScreen extends StatefulWidget {
  const AdminChatPanelScreen({super.key});

  @override
  State<AdminChatPanelScreen> createState() => _AdminChatPanelScreenState();
}

class _AdminChatPanelScreenState extends State<AdminChatPanelScreen> {
  List<dynamic> _users = [];
  int? _selectedUserId;
  String _selectedUserName = '';
  List<Map<String, dynamic>> _messages = [];
  bool _isLoadingUsers = true;
  bool _isLoadingMessages = false;
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _fetchUsers();
    
    final socketService = Provider.of<SocketService>(context, listen: false);
    socketService.socket?.on('newMessage', _handleNewMessage);
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
  }

  Future<void> _fetchUsers() async {
    try {
      final authService = Provider.of<AuthService>(context, listen: false);
      final response = await http.get(
        Uri.parse('${AuthService.baseUrl}/api/users'),
        headers: {'Authorization': 'Bearer ${authService.token}'}
      );

      if (response.statusCode == 200) {
        final List<dynamic> users = jsonDecode(response.body);
        setState(() {
          _users = users.where((u) => u['role'] != 'admin').toList(); // Adminleri listeden çıkarabiliriz veya tutabiliriz
          _isLoadingUsers = false;
        });
      }
    } catch (e) {
      print('Kullanıcı listesi hatası: $e');
      setState(() => _isLoadingUsers = false);
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

    // Optimistik Ekleme
    setState(() {
      _messages.add({
        'from': 'admin', 
        'to': _selectedUserId,
        'message': text,
        'timestamp': DateTime.now().toIso8601String(),
        'type': 'text'
      });
      _scrollToBottom();
      _messageController.clear();
    });
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

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        // SOL PANEL: Kullanıcı Listesi
        Container(
          width: 300,
          color: const Color(0xFF1E1E1E),
          child: Column(
            children: [
              Container(
                padding: const EdgeInsets.all(20),
                color: const Color(0xFF2C2C2C),
                width: double.infinity,
                child: const Text('Mesajlar', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
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
                          tileColor: isSelected ? const Color(0xFFE65100).withOpacity(0.3) : null,
                          leading: CircleAvatar(
                            backgroundColor: Colors.grey,
                            backgroundImage: user['avatar'] != null ? NetworkImage(user['avatar']) : null,
                            child: user['avatar'] == null ? Text(user['personelCode'] ?? '?', style: const TextStyle(color: Colors.white)) : null,
                          ),
                          title: Text(user['name'], style: const TextStyle(color: Colors.white)),
                          onTap: () => _selectUser(user['id'], user['name']),
                        );
                      },
                    ),
              ),
            ],
          ),
        ),
        
        // SAĞ PANEL: Sohbet
        Expanded(
          child: Container(
            color: const Color(0xFF121212),
            child: _selectedUserId == null
              ? const Center(child: Text('Sohbet etmek için bir personel seçin', style: TextStyle(color: Colors.white54, fontSize: 16)))
              : Column(
                  children: [
                    // Header
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 15),
                      color: const Color(0xFF1E1E1E),
                      child: Row(
                        children: [
                          CircleAvatar(
                            backgroundColor: const Color(0xFFE65100),
                            backgroundImage: _users.firstWhere((u)=>u['id']==_selectedUserId)['avatar'] != null ? NetworkImage(_users.firstWhere((u)=>u['id']==_selectedUserId)['avatar']) : null,
                            child: _users.firstWhere((u)=>u['id']==_selectedUserId)['avatar'] == null ? Text(_users.firstWhere((u)=>u['id']==_selectedUserId)['personelCode'], style: const TextStyle(color: Colors.white)) : null,
                          ),
                          const SizedBox(width: 15),
                          Text(_selectedUserName, style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
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
                              // Admin panelindeyiz. 
                              // Mesaj 'from' kim? Eğer 'from' == _selectedUserId -> Sola (Gelen)
                              // Yoksa (Benim) -> Sağa
                              // Backend 'userId' int döner.
                              
                          final isIncome = msg['from'].toString() == _selectedUserId.toString() || msg['senderId'].toString() == _selectedUserId.toString();
                              
                              return Align(
                                alignment: isIncome ? Alignment.centerLeft : Alignment.centerRight,
                                child: Container(
                                  margin: const EdgeInsets.symmetric(vertical: 5),
                                  padding: const EdgeInsets.all(12),
                                  constraints: const BoxConstraints(maxWidth: 400),
                                  decoration: BoxDecoration(
                                    color: isIncome ? const Color(0xFF2C2C2C) : const Color(0xFFE65100),
                                    borderRadius: BorderRadius.only(
                                      topLeft: const Radius.circular(12),
                                      topRight: const Radius.circular(12),
                                      bottomLeft: isIncome ? Radius.zero : const Radius.circular(12),
                                      bottomRight: isIncome ? const Radius.circular(12) : Radius.zero,
                                    ),
                                  ),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      if (msg['type'] == 'image')
                                        Image.memory(base64Decode(msg['message']), width: 200, gaplessPlayback: true)
                                      else
                                        Text(msg['message'] ?? '', style: const TextStyle(color: Colors.white, fontSize: 15)),
                                      
                                      const SizedBox(height: 5),
                                      Text(
                                        DateFormat('HH:mm').format(DateTime.parse(msg['timestamp'] ?? DateTime.now().toIso8601String()).toLocal()),
                                        style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 10),
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
                      color: const Color(0xFF1E1E1E),
                      child: Row(
                        children: [
                          Expanded(
                            child: TextField(
                              controller: _messageController,
                              style: const TextStyle(color: Colors.white),
                              decoration: InputDecoration(
                                hintText: 'Bir mesaj yazın...',
                                hintStyle: const TextStyle(color: Colors.white54),
                                filled: true,
                                fillColor: const Color(0xFF2C2C2C),
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
