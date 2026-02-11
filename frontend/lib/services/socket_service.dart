import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:socket_io_client/socket_io_client.dart' as IO;
import 'package:shared_preferences/shared_preferences.dart';
import '../models/location_update.dart';

class SocketService extends ChangeNotifier {
  static final SocketService _instance = SocketService._internal();
  factory SocketService() => _instance;
  SocketService._internal();

  IO.Socket? _socket;
  bool _isConnected = false;
  bool _isAuthenticated = false;
  Timer? _heartbeatTimer;
  Timer? _reconnectTimer;
  int _reconnectAttempts = 0;
  static const int _maxReconnectAttempts = 999999; // Sonsuz deneme
  static const Duration _heartbeatInterval = Duration(seconds: 15);

  bool get isConnected => _isConnected;
  bool get isAuthenticated => _isAuthenticated;
  IO.Socket? get socket => _socket; // Socket erişimi için getter

  // Event streams
  final StreamController<Map<String, dynamic>> _messageController =
      StreamController<Map<String, dynamic>>.broadcast();
  final StreamController<Map<String, dynamic>> _locationController =
      StreamController<Map<String, dynamic>>.broadcast();
  final StreamController<Map<String, dynamic>> _notificationController =
      StreamController<Map<String, dynamic>>.broadcast();
  final StreamController<Map<String, dynamic>> _updateController =
      StreamController<Map<String, dynamic>>.broadcast();

  Stream<Map<String, dynamic>> get messageStream => _messageController.stream;
  Stream<Map<String, dynamic>> get locationStream => _locationController.stream;
  Stream<Map<String, dynamic>> get notificationStream => _notificationController.stream;
  Stream<Map<String, dynamic>> get updateStream => _updateController.stream;

  /// Connect to socket server
  Future<void> connect(String serverUrl, String token) async {
    if (_socket != null && _isConnected) {
      print('⚠️ Socket already connected');
      return;
    }

    try {
      print('🔌 Connecting to socket: $serverUrl');

      _socket = IO.io(
        serverUrl,
        IO.OptionBuilder()
            .setTransports(['websocket', 'polling'])
            .enableAutoConnect()
            .enableReconnection()
            .setReconnectionAttempts(_maxReconnectAttempts)
            .setReconnectionDelay(2000)
            .setReconnectionDelayMax(10000)
            .setTimeout(20000)
            .setExtraHeaders({'Authorization': 'Bearer $token'})
            .build(),
      );

      _setupSocketListeners(token);
    } catch (e) {
      print('❌ Socket connection error: $e');
      _scheduleReconnect(serverUrl, token);
    }
  }

  /// Setup socket event listeners
  void _setupSocketListeners(String token) {
    _socket?.onConnect((_) {
      print('✅ Socket connected');
      _isConnected = true;
      _reconnectAttempts = 0;
      _reconnectTimer?.cancel();
      notifyListeners();

      // Authenticate
      _socket?.emit('authenticate', token);

      // Start heartbeat
      _startHeartbeat();
    });

    _socket?.onDisconnect((_) {
      print('❌ Socket disconnected');
      _isConnected = false;
      _isAuthenticated = false;
      _heartbeatTimer?.cancel();
      notifyListeners();
    });

    _socket?.onConnectError((error) {
      print('❌ Socket connect error: $error');
      _isConnected = false;
      notifyListeners();
    });

    _socket?.onError((error) {
      print('❌ Socket error: $error');
    });

    // Authentication response
    _socket?.on('authenticated', (data) {
      if (data['success'] == true) {
        print('✅ Socket authenticated');
        _isAuthenticated = true;
        notifyListeners();
      } else {
        print('❌ Socket authentication failed: ${data['error']}');
        _isAuthenticated = false;
      }
    });

    // Heartbeat acknowledgment
    _socket?.on('heartbeat_ack', (_) {
      // Heartbeat received
    });

    // Location update acknowledgment
    _socket?.on('locationUpdateAck', (data) {
      if (data['success'] != true) {
        print('⚠️ Location update failed: ${data['error']}');
      }
    });

    // Message sent acknowledgment
    _socket?.on('messageSent', (data) {
      if (data['success'] != true) {
        print('⚠️ Message send failed: ${data['error']}');
      }
    });

    // New message received
    _socket?.on('newMessage', (data) {
      print('📨 New message received');
      _messageController.add(Map<String, dynamic>.from(data));
    });

    // Location update received
    _socket?.on('locationUpdate', (data) {
      print('📍 Location update received');
      _locationController.add(Map<String, dynamic>.from(data));
    });

    // Notification received
    _socket?.on('notification', (data) {
      print('🔔 Notification received');
      _notificationController.add(Map<String, dynamic>.from(data));
    });

    // Update available
    _socket?.on('updateAvailable', (data) {
      print('🔄 Update available');
      _updateController.add(Map<String, dynamic>.from(data));
    });

    // Report created
    _socket?.on('reportCreated', (data) {
      print('📄 Report created notification');
      _notificationController.add({
        'type': 'report_created',
        'data': data,
      });
    });
  }

  /// Start heartbeat to keep connection alive
  void _startHeartbeat() {
    _heartbeatTimer?.cancel();
    _heartbeatTimer = Timer.periodic(_heartbeatInterval, (timer) {
      if (_isConnected && _socket != null) {
        _socket!.emit('heartbeat');
      } else {
        timer.cancel();
      }
    });
  }

  /// Schedule reconnection attempt
  void _scheduleReconnect(String serverUrl, String token) {
    if (_reconnectAttempts >= _maxReconnectAttempts) {
      print('❌ Max reconnection attempts reached');
      return;
    }

    _reconnectAttempts++;
    final delay = Duration(seconds: 2 * _reconnectAttempts);
    
    print('🔄 Scheduling reconnect attempt $_reconnectAttempts in ${delay.inSeconds}s');
    
    _reconnectTimer?.cancel();
    _reconnectTimer = Timer(delay, () {
      connect(serverUrl, token);
    });
  }

  /// Send location update
  void sendLocationUpdate(LocationUpdate location) {
    if (!_isConnected || !_isAuthenticated) {
      print('⚠️ Cannot send location: not connected or authenticated');
      return;
    }

    try {
      _socket?.emit('updateLocation', {
        'lat': location.latitude,
        'lng': location.longitude,
        'speed': location.speed ?? 0,
        'battery': location.batteryLevel?.toInt() ?? 0,
        'timestamp': location.timestamp.toIso8601String(),
      });
    } catch (e) {
      print('❌ Error sending location: $e');
    }
  }

  /// Send message
  void sendMessage({
    required String to,
    required String message,
    String type = 'text',
  }) {
    if (!_isConnected || !_isAuthenticated) {
      print('⚠️ Cannot send message: not connected or authenticated');
      return;
    }

    try {
      _socket?.emit('sendMessage', {
        'to': to,
        'message': message,
        'type': type,
      });
    } catch (e) {
      print('❌ Error sending message: $e');
    }
  }

  /// Join group
  void joinGroup(String groupName) {
    if (!_isConnected || !_isAuthenticated) {
      print('⚠️ Cannot join group: not connected or authenticated');
      return;
    }

    try {
      _socket?.emit('joinGroup', groupName);
    } catch (e) {
      print('❌ Error joining group: $e');
    }
  }

  /// Disconnect socket
  void disconnect() {
    print('🔌 Disconnecting socket');
    _heartbeatTimer?.cancel();
    _reconnectTimer?.cancel();
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
    _isConnected = false;
    _isAuthenticated = false;
    _reconnectAttempts = 0;
    notifyListeners();
  }

  /// Dispose resources
  @override
  void dispose() {
    disconnect();
    _messageController.close();
    _locationController.close();
    _notificationController.close();
    _updateController.close();
    super.dispose();
  }
}
