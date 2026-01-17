import 'dart:async';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_background_service/flutter_background_service.dart';
// import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:geolocator/geolocator.dart';
import 'package:socket_io_client/socket_io_client.dart' as IO;
import 'package:shared_preferences/shared_preferences.dart';
import 'auth_service.dart';

// Arka plan servisi başlatma fonksiyonu
Future<void> initializeService() async {
  final service = FlutterBackgroundService();

  /*
  const AndroidNotificationChannel channel = AndroidNotificationChannel(
    'gps_tracking_channel',
    'GPS Takip Servisi',
    description: 'Konumunuz sunucuya gönderiliyor',
    importance: Importance.low,
  );

  final FlutterLocalNotificationsPlugin flutterLocalNotificationsPlugin =
      FlutterLocalNotificationsPlugin();

  await flutterLocalNotificationsPlugin
      .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
      ?.createNotificationChannel(channel);
  */

  await service.configure(
    androidConfiguration: AndroidConfiguration(
      onStart: onStart,
      autoStart: true,
      isForegroundMode: true,
      notificationChannelId: 'gps_tracking_channel',
      initialNotificationTitle: 'GPS Rapor',
      initialNotificationContent: 'Konum takibi aktif',
      foregroundServiceNotificationId: 888,
    ),
    iosConfiguration: IosConfiguration(
      autoStart: true,
      onForeground: onStart,
      onBackground: onIosBackground,
    ),
  );
}

@pragma('vm:entry-point')
Future<bool> onIosBackground(ServiceInstance service) async {
  return true;
}

@pragma('vm:entry-point')
void onStart(ServiceInstance service) async {
  DartPluginRegistrant.ensureInitialized();
  
  // Socket bağlantısı için token'ı al
  final prefs = await SharedPreferences.getInstance();
  final token = prefs.getString('token');

  if (token == null) {
      await service.stopSelf();
      return;
  }

  // Socket Bağlantısı
  IO.Socket socket = IO.io(AuthService.baseUrl, IO.OptionBuilder()
      .setTransports(['websocket'])
      .enableAutoConnect()
      .build());

  socket.onConnect((_) {
    print('Background Socket Connected');
    socket.emit('authenticate', token);
  });

  // Konum Takibi
  Timer.periodic(const Duration(seconds: 10), (timer) async {
    if (service is AndroidServiceInstance) {
      if (await service.isForegroundService()) {
        service.setForegroundNotificationInfo(
          title: "GPS Rapor Aktif",
          content: "Konum gönderildi: ${DateTime.now().hour}:${DateTime.now().minute}",
        );
      }
    }

    try {
      Position position = await Geolocator.getCurrentPosition(desiredAccuracy: LocationAccuracy.high);
      
      print('Konum: ${position.latitude}, ${position.longitude}');
      
      socket.emit('updateLocation', {
        'latitude': position.latitude,
        'longitude': position.longitude
      });
      
    } catch (e) {
      print('Konum hatası: $e');
    }
  });
}
