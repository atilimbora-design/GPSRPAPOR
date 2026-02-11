import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../services/auth_service.dart';

class AccountScreen extends StatefulWidget {
  const AccountScreen({super.key});

  @override
  State<AccountScreen> createState() => _AccountScreenState();
}

class _AccountScreenState extends State<AccountScreen> {
  bool _isUploading = false;
  File? _selectedImage;

  Future<void> _pickImage() async {
    final picker = ImagePicker();
    final pickedFile = await picker.pickImage(source: ImageSource.gallery, imageQuality: 50);

    if (pickedFile != null) {
      setState(() {
        _selectedImage = File(pickedFile.path);
      });
      _uploadImage();
    }
  }

  Future<void> _uploadImage() async {
    if (_selectedImage == null) return;

    setState(() => _isUploading = true);

    try {
      final bytes = await _selectedImage!.readAsBytes();
      final base64Image = base64Encode(bytes);
      final authService = Provider.of<AuthService>(context, listen: false);

      final response = await http.post(
        Uri.parse('${AuthService.baseUrl}/api/users/avatar'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ${authService.token}'
        },
        body: jsonEncode({'imageBase64': base64Image}),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final newAvatarUrl = data['avatarUrl'];
        await authService.updateUserAvatar(newAvatarUrl);

        if (mounted) {
           ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Profil fotoğrafı güncellendi!')));
        }
      } else {
        throw Exception('Sunucu hatası: ${response.statusCode}');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Hata: $e')));
      }
    } finally {
      if (mounted) setState(() => _isUploading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = Provider.of<AuthService>(context).user;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Hesabım', style: TextStyle(fontWeight: FontWeight.bold)),
        centerTitle: true,
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        child: Column(
          children: [
            const SizedBox(height: 30),
            
            // Profil Fotoğrafı Alanı
            Center(
              child: Stack(
                children: [
                  Container(
                    width: 150,
                    height: 150,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(color: const Color(0xFFE65100), width: 4),
                      boxShadow: [
                         BoxShadow(color: const Color(0xFFE65100).withOpacity(0.4), blurRadius: 20, spreadRadius: 5)
                      ],
                      image: _selectedImage != null
                          ? DecorationImage(image: FileImage(_selectedImage!), fit: BoxFit.cover)
                          : (user != null && user['avatar'] != null
                              ? DecorationImage(image: NetworkImage(user['avatar']), fit: BoxFit.cover)
                              : null),
                    ),
                    child: (_selectedImage == null && (user == null || user['avatar'] == null))
                        ? const Icon(Icons.person, size: 80, color: Colors.white70)
                        : null,
                  ),
                  Positioned(
                    bottom: 0,
                    right: 0,
                    child: GestureDetector(
                      onTap: _isUploading ? null : _pickImage,
                      child: Container(
                        padding: const EdgeInsets.all(10),
                        decoration: const BoxDecoration(
                          color: Color(0xFFE65100),
                          shape: BoxShape.circle,
                        ),
                        child: _isUploading 
                            ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                            : const Icon(Icons.camera_alt, color: Colors.white, size: 20),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            
            const SizedBox(height: 20),
            
            Text(
              user?['name'] ?? 'İsimsiz',
              style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Colors.black87),
            ),
            Text(
              user?['role'] == 'admin' ? 'Yönetici' : 'Personel',
              style: const TextStyle(fontSize: 16, color: Colors.orange),
            ),

            const SizedBox(height: 40),
            
            // Bilgi Kartı
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 20),
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(color: Colors.grey.withOpacity(0.1), blurRadius: 10, offset: const Offset(0, 5))
                ],
              ),
              child: Column(
                children: [
                   _infoRow(Icons.badge, 'Kullanıcı Kodu (ID)', user?['code'] ?? 'Bilinmiyor'),
                   Divider(color: Colors.grey.shade200),
                   _infoRow(Icons.person, 'Ad Soyad', user?['name'] ?? 'Bilinmiyor'),
                   Divider(color: Colors.grey.shade200),
                   _infoRow(Icons.security, 'Yetki Seviyesi', user?['role'] == 'admin' ? 'Admin / Yönetici' : 'Standart Kullanıcı'),
                ],
              ),
            ),
            
            const SizedBox(height: 30),
            
            // Çıkış Butonu
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () {
                    Provider.of<AuthService>(context, listen: false).logout();
                    Navigator.pushNamedAndRemoveUntil(context, '/login', (route) => false);
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.redAccent.withOpacity(0.9),
                    padding: const EdgeInsets.symmetric(vertical: 15),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    elevation: 0,
                  ),
                  child: const Text('ÇIKIŞ YAP', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _infoRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Row(
        children: [
          Icon(icon, color: Colors.grey, size: 22),
          const SizedBox(width: 15),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: const TextStyle(color: Colors.grey, fontSize: 12)),
                Text(value, style: const TextStyle(color: Colors.black87, fontSize: 16, fontWeight: FontWeight.w500)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
