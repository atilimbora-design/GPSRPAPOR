import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'dart:convert';
import 'dart:io';
import 'package:image_picker/image_picker.dart';
import 'package:http/http.dart' as http;
import '../services/socket_service.dart';
import '../services/auth_service.dart';

class ChatScreen extends StatefulWidget {
  final String targetId; // 'admin', 'group_X', or userId
  final String targetName;

  const ChatScreen({super.key, required this.targetId, required this.targetName});

  @override
  _ChatScreenState createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final TextEditingController _controller = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  List<Map<String, dynamic>> _messages = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadMessages();
    _ensureSocketConnected();
    
    // Socket listener setup
    final socketService = Provider.of<SocketService>(context, listen: false);
    socketService.socket?.on('newMessage', (data) {
      if (mounted) {
        // Eğer mesaj bu sohbetle ilgiliyse ekle
        // targetId admin ise ve gelen mesaj group:admins ise
        // veya targetId user_X ise ve gelen mesaj from X ise
        // Basit kontrol:
        _addMessageFromSocket(data);
      }
    });

    // Group join
    if (widget.targetId.startsWith('group_')) {
      socketService.socket?.on('connect', (_) {
        socketService.socket?.emit('joinGroup', widget.targetId);
      });
      // best-effort in case already connected
      socketService.socket?.emit('joinGroup', widget.targetId);
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

  void _addMessageFromSocket(dynamic data) {
    // Logic to filter incoming messages
    final authService = Provider.of<AuthService>(context, listen: false);
    final myId = authService.user!['id'].toString();
    
    // Gelen mesaj kime?
    // Eğer ben gönderdiysem zaten eklemişimdir (optimistik UI) veya server onayı
    // Ama farklı cihazdan attıysam görmek isterim.
    
    // Filtreleme mantığı:
    // Eğer targetId == 'admin' ve data.to == 'admins' -> Ekle
    // Eğer targetId == data.from -> Ekle (Karşıdan gelen)
    // Eğer benim ID == data.from -> Ekle (Benim attığım, serverdan döndü)
    
    bool shouldAdd = false;
    
    if (widget.targetId == 'admins') {
       if (data['to'] == 'admin' || data['to'] == 'admins') shouldAdd = true;
       if (data['to'].toString() == myId) shouldAdd = true; // Admin sent to me
    } else if (widget.targetId.startsWith('group_') && data['to'] == widget.targetId) {
       shouldAdd = true;
    } else if (data['from'].toString() == widget.targetId) {
       shouldAdd = true;
    } else if (data['from'].toString() == myId && (data['to'].toString() == widget.targetId)) {
       shouldAdd = true;
    }

    if (shouldAdd) {
      setState(() {
        // Tekrar eklemeyi önlemek için ID kontrolü yapılabilir
        if (!_messages.any((m) => m['id'] == data['id'])) {
           _messages.add(data);
           _scrollToBottom();
        }
      });
    }
  }

  Future<void> _loadMessages() async {
    final authService = Provider.of<AuthService>(context, listen: false);
    final url = Uri.parse('${AuthService.baseUrl}/api/messages/${widget.targetId}');
    try {
      final response = await http.get(url, headers: {
        'Authorization': 'Bearer ${authService.token}'
      });

      if (response.statusCode == 200) {
        final List<dynamic> data = jsonDecode(response.body);
        setState(() {
          _messages = data.map((e) => e as Map<String, dynamic>).toList();
          _isLoading = false;
        });
        _scrollToBottom();
      } else {
        if (mounted) {
          setState(() => _isLoading = false);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Mesajlar yüklenemedi: ${response.statusCode}')),
          );
        }
      }
    } catch (e) {
      print('Mesaj yükleme hatası: $e');
      setState(() => _isLoading = false);
    }
  }

  void _sendMessage({String type = 'text', String? content}) {
    final text = content ?? _controller.text.trim();
    if (text.isEmpty && type == 'text') return;

    final socketService = Provider.of<SocketService>(context, listen: false);
    
    socketService.socket?.emit('sendMessage', {
      'to': widget.targetId,
      'message': text,
      'type': type
    });

    _controller.clear();
    // Optimistik ekleme yapılabilir ama socket dönüşü hızlıdır
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

  Future<void> _pickImage() async {
    final picker = ImagePicker();
    final pickedFile = await picker.pickImage(source: ImageSource.camera, imageQuality: 50);
    
    if (pickedFile != null) {
      // Base64 çevir ve gönder
      final bytes = await File(pickedFile.path).readAsBytes();
      final base64Img = base64Encode(bytes);
      _sendMessage(type: 'image', content: base64Img);
    }
  }

  @override
  Widget build(BuildContext context) {
    final authService = Provider.of<AuthService>(context);
    final myId = authService.user!['id'];

    return Scaffold(
      backgroundColor: const Color(0xFFF5F7FA), // Açık tema arka plan
      resizeToAvoidBottomInset: true,
      appBar: AppBar(
        title: Text(widget.targetName, style: const TextStyle(color: Colors.black87)),
        backgroundColor: Colors.white,
        elevation: 1,
        iconTheme: const IconThemeData(color: Colors.black87),
      ),
      body: SafeArea(
        child: Column(
        children: [
          Expanded(
            child: _isLoading 
              ? const Center(child: CircularProgressIndicator())
              : ListView.builder(
                  controller: _scrollController,
                  padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 10),
                  itemCount: _messages.length,
                  itemBuilder: (context, index) {
                    final msg = _messages[index];
                    final isMe = msg['from'] == myId || msg['senderId'] == myId; 
                    
                    // KULLANICI İSTEĞİ TERS YÖN:
                    // Ben (isMe) -> SOL (Normalde sağdır)
                    // Karşı (!isMe) -> SAĞ (Normalde soldur)
                    
                    return Align(
                      alignment: isMe ? Alignment.centerLeft : Alignment.centerRight,
                      child: Container(
                        margin: const EdgeInsets.symmetric(vertical: 5),
                        padding: const EdgeInsets.all(12),
                        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
                        decoration: BoxDecoration(
                          color: isMe ? Colors.white : const Color(0xFFE65100),
                          borderRadius: BorderRadius.only(
                            topLeft: const Radius.circular(12),
                            topRight: const Radius.circular(12),
                            bottomLeft: isMe ? Radius.zero : const Radius.circular(12),
                            bottomRight: isMe ? const Radius.circular(12) : Radius.zero,
                          ),
                          boxShadow: [
                            BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 4, offset: const Offset(0, 2))
                          ],
                          border: isMe ? Border.all(color: Colors.grey.shade200) : null,
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            if (!isMe && widget.targetId.startsWith('group')) 
                              Padding(
                                padding: const EdgeInsets.only(bottom: 4),
                                child: Text(msg['fromName'] ?? msg['senderName'] ?? 'Anonim', 
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Colors.white)),
                              ),
                            
                            if (msg['type'] == 'image')
                                ConstrainedBox(
                                  constraints: BoxConstraints(
                                    maxWidth: MediaQuery.of(context).size.width * 0.6,
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
                                Text(
                                  msg['message'] ?? msg['content'] ?? '',
                                  style: TextStyle(fontSize: 16, color: isMe ? Colors.black87 : Colors.white),
                                ),

                            const SizedBox(height: 5),
                            Text(
                              DateFormat('HH:mm').format(
                                DateTime.parse(
                                  (msg['timestamp'] ?? msg['createdAt'] ?? DateTime.now().toIso8601String()).toString(),
                                ).toLocal(),
                              ),
                              style: TextStyle(fontSize: 10, color: isMe ? Colors.grey : Colors.white70),
                              textAlign: TextAlign.end,
                            )
                          ],
                        ),
                      ),
                    );
                  },
                ),
          ),
          Container(
            padding: const EdgeInsets.all(10.0),
            color: Colors.white,
            child: Row(
              children: [
                CircleAvatar(
                  backgroundColor: Colors.blue.shade50,
                  child: IconButton(
                    icon: const Icon(Icons.camera_alt, color: Colors.blue),
                    onPressed: _pickImage,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: TextField(
                    controller: _controller,
                    decoration: InputDecoration(
                      hintText: 'Mesaj yaz...',
                      hintStyle: const TextStyle(color: Colors.grey),
                      filled: true,
                      fillColor: Colors.grey.shade100,
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(25), borderSide: BorderSide.none),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                    ),
                    style: const TextStyle(color: Colors.black87),
                  ),
                ),
                const SizedBox(width: 8),
                CircleAvatar(
                  backgroundColor: const Color(0xFFE65100),
                  child: IconButton(
                    icon: const Icon(Icons.send, color: Colors.white),
                    onPressed: () => _sendMessage(),
                  ),
                ),
              ],
            ),
          )
        ],
      ),
      ),
    );
  }
}
