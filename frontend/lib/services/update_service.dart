import 'dart:io';
import 'package:dio/dio.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:path_provider/path_provider.dart';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';

class UpdateService extends ChangeNotifier {
  static final UpdateService _instance = UpdateService._internal();
  factory UpdateService() => _instance;
  UpdateService._internal();

  final Dio _dio = Dio();
  
  bool _isChecking = false;
  bool _isDownloading = false;
  double _downloadProgress = 0.0;
  String? _downloadedApkPath;

  bool get isChecking => _isChecking;
  bool get isDownloading => _isDownloading;
  double get downloadProgress => _downloadProgress;

  /// Check for updates
  Future<Map<String, dynamic>?> checkForUpdates(String serverUrl, String token) async {
    if (_isChecking) return null;

    _isChecking = true;
    notifyListeners();

    try {
      // Get current app version
      final packageInfo = await PackageInfo.fromPlatform();
      final currentVersionCode = int.parse(packageInfo.buildNumber);

      print('📱 Current version: ${packageInfo.version} ($currentVersionCode)');

      // Check server for latest version
      final response = await _dio.get(
        '$serverUrl/app/version',
        options: Options(
          headers: {'Authorization': 'Bearer $token'},
        ),
      );

      if (response.statusCode == 200) {
        final data = response.data;
        final serverVersionCode = data['versionCode'] as int;
        final serverVersionName = data['versionName'] as String;
        final apkUrl = data['apkUrl'] as String?;
        final releaseNotes = data['releaseNotes'] as String?;
        final mandatory = data['mandatory'] as bool? ?? false;

        print('🔄 Server version: $serverVersionName ($serverVersionCode)');

        if (serverVersionCode > currentVersionCode && apkUrl != null) {
          print('✅ Update available!');
          return {
            'available': true,
            'versionCode': serverVersionCode,
            'versionName': serverVersionName,
            'apkUrl': apkUrl,
            'releaseNotes': releaseNotes ?? 'Yeni güncelleme mevcut',
            'mandatory': mandatory,
            'currentVersion': packageInfo.version,
            'currentVersionCode': currentVersionCode,
          };
        } else {
          print('✅ App is up to date');
          return {
            'available': false,
            'currentVersion': packageInfo.version,
            'currentVersionCode': currentVersionCode,
          };
        }
      }
    } catch (e) {
      print('❌ Update check failed: $e');
    } finally {
      _isChecking = false;
      notifyListeners();
    }

    return null;
  }

  /// Download APK update
  Future<String?> downloadUpdate(String apkUrl) async {
    if (_isDownloading) return null;

    _isDownloading = true;
    _downloadProgress = 0.0;
    notifyListeners();

    try {
      // Get downloads directory
      final Directory? downloadsDir = await getExternalStorageDirectory();
      if (downloadsDir == null) {
        throw Exception('Cannot access downloads directory');
      }

      // Create APK file path
      final fileName = 'gps_rapor_update_${DateTime.now().millisecondsSinceEpoch}.apk';
      final filePath = '${downloadsDir.path}/$fileName';

      print('📥 Downloading APK to: $filePath');

      // Download APK
      await _dio.download(
        apkUrl,
        filePath,
        onReceiveProgress: (received, total) {
          if (total != -1) {
            _downloadProgress = received / total;
            notifyListeners();
            print('📥 Download progress: ${(_downloadProgress * 100).toStringAsFixed(1)}%');
          }
        },
      );

      print('✅ APK downloaded successfully');
      _downloadedApkPath = filePath;
      
      return filePath;
    } catch (e) {
      print('❌ APK download failed: $e');
      return null;
    } finally {
      _isDownloading = false;
      _downloadProgress = 0.0;
      notifyListeners();
    }
  }

  /// Install APK (Android only)
  Future<bool> installUpdate(String apkPath) async {
    if (!Platform.isAndroid) {
      print('⚠️ APK installation only supported on Android');
      return false;
    }

    try {
      final file = File(apkPath);
      if (!await file.exists()) {
        print('❌ APK file not found: $apkPath');
        return false;
      }

      print('📦 Installing APK: $apkPath');

      // Launch APK installer
      final uri = Uri.parse('file://$apkPath');
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
        return true;
      } else {
        print('❌ Cannot launch APK installer');
        return false;
      }
    } catch (e) {
      print('❌ APK installation failed: $e');
      return false;
    }
  }

  /// Auto-update flow
  Future<void> autoUpdate(String serverUrl, String token, {bool silent = false}) async {
    try {
      // Check for updates
      final updateInfo = await checkForUpdates(serverUrl, token);
      
      if (updateInfo == null || updateInfo['available'] != true) {
        if (!silent) {
          print('✅ No updates available');
        }
        return;
      }

      final apkUrl = updateInfo['apkUrl'] as String;
      final mandatory = updateInfo['mandatory'] as bool;
      final versionName = updateInfo['versionName'] as String;

      print('🔄 Update available: $versionName (Mandatory: $mandatory)');

      // Download update
      final apkPath = await downloadUpdate(apkUrl);
      
      if (apkPath != null) {
        // Install update
        await installUpdate(apkPath);
      }
    } catch (e) {
      print('❌ Auto-update failed: $e');
    }
  }

  /// Save last update check time
  Future<void> saveLastUpdateCheck() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt('last_update_check', DateTime.now().millisecondsSinceEpoch);
  }

  /// Get last update check time
  Future<DateTime?> getLastUpdateCheck() async {
    final prefs = await SharedPreferences.getInstance();
    final timestamp = prefs.getInt('last_update_check');
    return timestamp != null ? DateTime.fromMillisecondsSinceEpoch(timestamp) : null;
  }

  /// Should check for updates (once per day)
  Future<bool> shouldCheckForUpdates() async {
    final lastCheck = await getLastUpdateCheck();
    if (lastCheck == null) return true;

    final now = DateTime.now();
    final difference = now.difference(lastCheck);
    
    return difference.inHours >= 24;
  }
}
