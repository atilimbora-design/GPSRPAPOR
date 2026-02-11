import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:permission_handler/permission_handler.dart';
import 'dart:io';

class NotificationService {
  static final NotificationService _instance = NotificationService._internal();
  factory NotificationService() => _instance;
  NotificationService._internal();

  final FlutterLocalNotificationsPlugin _notifications = FlutterLocalNotificationsPlugin();
  bool _isInitialized = false;

  /// Initialize notification service
  Future<void> initialize() async {
    if (_isInitialized) return;

    try {
      // Android initialization
      const androidSettings = AndroidInitializationSettings('@mipmap/launcher_icon');

      // iOS initialization
      const iosSettings = DarwinInitializationSettings(
        requestAlertPermission: true,
        requestBadgePermission: true,
        requestSoundPermission: true,
      );

      const initSettings = InitializationSettings(
        android: androidSettings,
        iOS: iosSettings,
      );

      await _notifications.initialize(
        initSettings,
        onDidReceiveNotificationResponse: _onNotificationTapped,
      );

      // Request permissions
      await _requestPermissions();

      // Create notification channels (Android)
      if (Platform.isAndroid) {
        await _createNotificationChannels();
      }

      _isInitialized = true;
      print('✅ Notification service initialized');
    } catch (e) {
      print('❌ Notification initialization failed: $e');
    }
  }

  /// Request notification permissions
  Future<void> _requestPermissions() async {
    if (Platform.isAndroid) {
      final status = await Permission.notification.request();
      if (status.isGranted) {
        print('✅ Notification permission granted');
      } else {
        print('⚠️ Notification permission denied');
      }
    } else if (Platform.isIOS) {
      await _notifications
          .resolvePlatformSpecificImplementation<IOSFlutterLocalNotificationsPlugin>()
          ?.requestPermissions(
            alert: true,
            badge: true,
            sound: true,
          );
    }
  }

  /// Create notification channels (Android)
  Future<void> _createNotificationChannels() async {
    // Messages channel
    const messagesChannel = AndroidNotificationChannel(
      'messages',
      'Mesajlar',
      description: 'Yeni mesaj bildirimleri',
      importance: Importance.high,
      playSound: true,
      enableVibration: true,
    );

    // Location channel
    const locationChannel = AndroidNotificationChannel(
      'location',
      'Konum Takibi',
      description: 'Konum takibi bildirimleri',
      importance: Importance.low,
      playSound: false,
      enableVibration: false,
    );

    // Updates channel
    const updatesChannel = AndroidNotificationChannel(
      'updates',
      'Güncellemeler',
      description: 'Uygulama güncellemeleri',
      importance: Importance.high,
      playSound: true,
      enableVibration: true,
    );

    // Reports channel
    const reportsChannel = AndroidNotificationChannel(
      'reports',
      'Raporlar',
      description: 'Rapor bildirimleri',
      importance: Importance.high,
      playSound: true,
      enableVibration: true,
    );

    // General channel
    const generalChannel = AndroidNotificationChannel(
      'general',
      'Genel',
      description: 'Genel bildirimler',
      importance: Importance.defaultImportance,
      playSound: true,
      enableVibration: true,
    );

    final plugin = _notifications.resolvePlatformSpecificImplementation<
        AndroidFlutterLocalNotificationsPlugin>();

    await plugin?.createNotificationChannel(messagesChannel);
    await plugin?.createNotificationChannel(locationChannel);
    await plugin?.createNotificationChannel(updatesChannel);
    await plugin?.createNotificationChannel(reportsChannel);
    await plugin?.createNotificationChannel(generalChannel);

    print('✅ Notification channels created');
  }

  /// Show message notification
  Future<void> showMessageNotification({
    required String title,
    required String body,
    String? payload,
  }) async {
    if (!_isInitialized) await initialize();

    const androidDetails = AndroidNotificationDetails(
      'messages',
      'Mesajlar',
      channelDescription: 'Yeni mesaj bildirimleri',
      importance: Importance.high,
      priority: Priority.high,
      showWhen: true,
      icon: '@mipmap/launcher_icon',
    );

    const iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    );

    const details = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );

    await _notifications.show(
      DateTime.now().millisecondsSinceEpoch % 100000,
      title,
      body,
      details,
      payload: payload,
    );
  }

  /// Show location notification (persistent)
  Future<void> showLocationNotification({
    required String title,
    required String body,
  }) async {
    if (!_isInitialized) await initialize();

    const androidDetails = AndroidNotificationDetails(
      'location',
      'Konum Takibi',
      channelDescription: 'Konum takibi bildirimleri',
      importance: Importance.low,
      priority: Priority.low,
      ongoing: true,
      autoCancel: false,
      showWhen: false,
      icon: '@mipmap/launcher_icon',
    );

    const iosDetails = DarwinNotificationDetails(
      presentAlert: false,
      presentBadge: false,
      presentSound: false,
    );

    const details = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );

    await _notifications.show(
      999, // Fixed ID for location notification
      title,
      body,
      details,
    );
  }

  /// Show update notification
  Future<void> showUpdateNotification({
    required String versionName,
    required String releaseNotes,
    bool mandatory = false,
  }) async {
    if (!_isInitialized) await initialize();

    const androidDetails = AndroidNotificationDetails(
      'updates',
      'Güncellemeler',
      channelDescription: 'Uygulama güncellemeleri',
      importance: Importance.high,
      priority: Priority.high,
      showWhen: true,
      icon: '@mipmap/launcher_icon',
    );

    const iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    );

    const details = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );

    await _notifications.show(
      DateTime.now().millisecondsSinceEpoch % 100000,
      mandatory ? '⚠️ Zorunlu Güncelleme' : '🔄 Güncelleme Mevcut',
      'Versiyon $versionName: $releaseNotes',
      details,
      payload: 'update',
    );
  }

  /// Show report notification
  Future<void> showReportNotification({
    required String title,
    required String body,
    String? payload,
  }) async {
    if (!_isInitialized) await initialize();

    const androidDetails = AndroidNotificationDetails(
      'reports',
      'Raporlar',
      channelDescription: 'Rapor bildirimleri',
      importance: Importance.high,
      priority: Priority.high,
      showWhen: true,
      icon: '@mipmap/launcher_icon',
    );

    const iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    );

    const details = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );

    await _notifications.show(
      DateTime.now().millisecondsSinceEpoch % 100000,
      title,
      body,
      details,
      payload: payload,
    );
  }

  /// Show general notification
  Future<void> showNotification({
    required String title,
    required String body,
    String? payload,
  }) async {
    if (!_isInitialized) await initialize();

    const androidDetails = AndroidNotificationDetails(
      'general',
      'Genel',
      channelDescription: 'Genel bildirimler',
      importance: Importance.defaultImportance,
      priority: Priority.defaultPriority,
      showWhen: true,
      icon: '@mipmap/launcher_icon',
    );

    const iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    );

    const details = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );

    await _notifications.show(
      DateTime.now().millisecondsSinceEpoch % 100000,
      title,
      body,
      details,
      payload: payload,
    );
  }

  /// Cancel location notification
  Future<void> cancelLocationNotification() async {
    await _notifications.cancel(999);
  }

  /// Cancel all notifications
  Future<void> cancelAll() async {
    await _notifications.cancelAll();
  }

  /// Notification tap handler
  void _onNotificationTapped(NotificationResponse response) {
    final payload = response.payload;
    print('📱 Notification tapped: $payload');
    
    // Handle notification tap based on payload
    if (payload == 'update') {
      // Navigate to update screen or trigger update
      print('🔄 Update notification tapped');
    }
  }
}
