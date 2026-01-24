import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:socket_io_client/socket_io_client.dart' as IO;
import 'auth_service.dart';

class SocketService with ChangeNotifier {
  IO.Socket? _socket;
  FlutterLocalNotificationsPlugin? _notifications;

  IO.Socket? get socket => _socket;

  void connect(String token) {
    if (_socket != null && _socket!.connected) return;

    _initNotifications();

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
      _showMessageNotification(data);
      print('New Message: $data');
      notifyListeners();
    });
  }

  Future<void> _initNotifications() async {
    if (kIsWeb ||
        !(defaultTargetPlatform == TargetPlatform.android ||
          defaultTargetPlatform == TargetPlatform.iOS)) {
      return;
    }
    if (_notifications != null) return;

    _notifications = FlutterLocalNotificationsPlugin();
    const android = AndroidInitializationSettings('@mipmap/ic_launcher');
    const ios = DarwinInitializationSettings();
    const initSettings = InitializationSettings(android: android, iOS: ios);
    await _notifications?.initialize(initSettings);

    final androidPlugin = _notifications?.resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>();
    await androidPlugin?.requestNotificationsPermission();
    final iosPlugin = _notifications?.resolvePlatformSpecificImplementation<IOSFlutterLocalNotificationsPlugin>();
    await iosPlugin?.requestPermissions(alert: true, badge: true, sound: true);
  }

  void _showMessageNotification(dynamic data) {
    if (_notifications == null) return;
    final message = data is Map ? (data['message'] ?? data['content'])?.toString() : null;
    if (message == null || message.isEmpty) return;

    final title = (data is Map ? data['fromName'] : null)?.toString() ?? 'Yeni Mesaj';
    _notifications?.show(
      DateTime.now().millisecondsSinceEpoch ~/ 1000,
      title,
      message,
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

  void disconnect() {
    _socket?.disconnect();
    _socket = null;
  }
}
