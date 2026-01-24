import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:package_info_plus/package_info_plus.dart';
import 'package:url_launcher/url_launcher.dart';
import 'auth_service.dart';

class UpdateService {
  static Future<void> checkForUpdate(BuildContext context) async {
    try {
      final info = await PackageInfo.fromPlatform();
      final localCode = int.tryParse(info.buildNumber) ?? 0;

      final response = await http.get(Uri.parse('${AuthService.baseUrl}/app/version'));
      if (response.statusCode != 200) return;

      final data = jsonDecode(response.body);
      final remoteCode = (data['versionCode'] as num?)?.toInt() ?? 0;
      final remoteName = data['versionName']?.toString() ?? '';
      final apkUrl = data['apkUrl']?.toString();

      if (remoteCode > localCode && apkUrl != null && apkUrl.isNotEmpty) {
        if (!context.mounted) return;
        await showDialog(
          context: context,
          barrierDismissible: false,
          builder: (context) => AlertDialog(
            backgroundColor: const Color(0xFF1E1E1E),
            title: const Text('Güncelleme Var', style: TextStyle(color: Colors.white)),
            content: Text(
              'Yeni sürüm mevcut: $remoteName\nGüncellemeyi indirmek ister misiniz?',
              style: const TextStyle(color: Colors.white70),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Sonra', style: TextStyle(color: Colors.white70)),
              ),
              ElevatedButton(
                onPressed: () async {
                  final url = Uri.parse(apkUrl);
                  await launchUrl(url, mode: LaunchMode.externalApplication);
                },
                child: const Text('İndir'),
              ),
            ],
          ),
        );
      }
    } catch (_) {}
  }
}
