import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter/foundation.dart';
import 'background_service.dart';

class AuthService with ChangeNotifier {
  // Raspberry Pi IP'si (Kullanıcının verdiği)
  static const String baseUrl = 'https://takip.atilimgida.com'; 
  
  String? _token;
  Map<String, dynamic>? _user;

  String? get token => _token;
  Map<String, dynamic>? get user => _user;

  bool get isAuthenticated => _token != null;

  Future<bool> login(String username, String password) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'username': username, 'password': password}),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        _token = data['token'];
        _user = data['user'];

        if (kIsWeb && _user?['role'] != 'admin') {
          _token = null;
          _user = null;
          return false;
        }
        
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('token', _token!);
        await prefs.setString('user', jsonEncode(_user));

        // Restart background service with new token
        if (!kIsWeb) {
          await stopBackgroundService();
          if (_user?['role'] != 'admin') {
            await initializeService();
          }
        }
        
        notifyListeners();
        return true;
      }
      return false;
    } catch (e) {
      print('Login Error: $e');
      return false;
    }
  }

  Future<void> logout() async {
    try {
      if (_token != null) {
        await http.post(
          Uri.parse('$baseUrl/api/logout'),
          headers: {'Authorization': 'Bearer $_token'},
        );
      }
    } catch (_) {}

    if (!kIsWeb) {
      await stopBackgroundService();
    }

    _token = null;
    _user = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
    notifyListeners();
  }

  Future<void> checkLoginStatus() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('token');
    final userStr = prefs.getString('user');

    if (token != null && userStr != null) {
      _token = token;
      _user = jsonDecode(userStr);
      notifyListeners();
    }
  }

  Future<void> updateUserAvatar(String avatarUrl) async {
    if (_user == null) return;
    _user = {..._user!, 'avatar': avatarUrl};
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('user', jsonEncode(_user));
    notifyListeners();
  }

  Future<bool> submitReport(Map<String, dynamic> reportData) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/reports'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $_token'
        },
        body: jsonEncode(reportData),
      );

      if (response.statusCode != 200) {
        print('Report Submit Error Response: ${response.body}');
      }

      return response.statusCode == 200;
    } catch (e) {
      print('Report Submit Error: $e');
      return false;
    }
  }
}
