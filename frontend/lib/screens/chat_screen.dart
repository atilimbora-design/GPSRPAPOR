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
      socketService.connect(token);
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
      backgroundColor: const Color(0xFF121212),
      resizeToAvoidBottomInset: true,
      appBar: AppBar(
        title: Text(widget.targetName),
        backgroundColor: const Color(0xFF1E1E1E),
      ),
      body: SafeArea(
        child: Column(
        children: [
          Expanded(
            child: _isLoading 
              ? const Center(child: CircularProgressIndicator())
              : ListView.builder(
                  controller: _scrollController,
                  itemCount: _messages.length,
                  itemBuilder: (context, index) {
                    final msg = _messages[index];
                    final isMe = msg['from'] == myId || msg['senderId'] == myId; // API uses senderId, Socket uses from
                    
                    return Align(
                      alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
                      child: Container(
                        margin: const EdgeInsets.symmetric(vertical: 5, horizontal: 10),
                        padding: const EdgeInsets.all(10),
                        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.7),
                        decoration: BoxDecoration(
                          color: isMe ? const Color(0xFFE65100) : const Color(0xFF2C2C2C),
                          borderRadius: BorderRadius.circular(10),
                          boxShadow: const [
                            BoxShadow(color: Colors.black45, blurRadius: 2, offset: Offset(1,1))
                          ],
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            if (!isMe && widget.targetId.startsWith('group')) 
                              Text(msg['fromName'] ?? msg['senderName'] ?? 'Anonim', 
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Colors.blue)),
                            
                            if (msg['type'] == 'image')
                                Image.memory(base64Decode(msg['message'] ?? msg['content']), gaplessPlayback: true)
                            else
                                Text(
                                  msg['message'] ?? msg['content'] ?? '',
                                  style: const TextStyle(fontSize: 16, color: Colors.white),
                                ),

                            const SizedBox(height: 5),
                            Text(
                              DateFormat('HH:mm').format(DateTime.parse(msg['timestamp'] ?? DateTime.now().toIso8601String()).toLocal()),
                              style: TextStyle(fontSize: 10, color: Colors.white.withOpacity(0.7)),
                              textAlign: TextAlign.end,
                            )
                          ],
                        ),
                      ),
                    );
                  },
                ),
          ),
          Padding(
            padding: const EdgeInsets.all(8.0),
            child: Row(
              children: [
                IconButton(
                  icon: const Icon(Icons.camera_alt, color: Color(0xFF00E5FF)),
                  onPressed: _pickImage,
                ),
                Expanded(
                  child: TextField(
                    controller: _controller,
                    decoration: InputDecoration(
                      hintText: 'Mesaj yaz...',
                      hintStyle: const TextStyle(color: Colors.white54),
                      filled: true,
                      fillColor: const Color(0xFF2C2C2C),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(20), borderSide: BorderSide.none),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 15, vertical: 10),
                    ),
                    style: const TextStyle(color: Colors.white),
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.send, color: Color(0xFFE65100)),
                  onPressed: () => _sendMessage(),
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
