import 'package:flutter/material.dart';
import 'package:socket_io_client/socket_io_client.dart' as IO;
import 'auth_service.dart';

class SocketService with ChangeNotifier {
  IO.Socket? _socket;

  IO.Socket? get socket => _socket;

  void connect(String token) {
    if (_socket != null && _socket!.connected) return;

    _socket = IO.io(AuthService.baseUrl, IO.OptionBuilder()
        .setTransports(['websocket'])
        .enableAutoConnect()
        .build());

    _socket!.onConnect((_) {
      print('Socket Connected');
      _socket!.emit('authenticate', token);
    });

    _socket!.onDisconnect((_) => print('Socket Disconnected'));
    
    _socket!.on('newMessage', (data) {
       // Burada local notification tetiklenebilir
       print('New Message: $data');
       notifyListeners();
    });
  }

  void disconnect() {
    _socket?.disconnect();
    _socket = null;
  }
}
