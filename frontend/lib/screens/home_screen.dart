import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:provider/provider.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../services/auth_service.dart';
import '../services/socket_service.dart';
import '../services/background_service.dart';
import 'package:permission_handler/permission_handler.dart';
import 'admin_list_screen.dart';
import 'report_screen.dart';
import 'user_reports_screen.dart';
import 'admin_map_screen.dart';
import 'account_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  Map<String, dynamic> _stats = {'totalCollection': 0.0};
  bool _isLoadingStats = true;

  @override
  void initState() {
    super.initState();
    _connectSocket();
    _requestPermissions();
    _fetchStats();
  }

  Future<void> _requestPermissions() async {
    // Bildirim İzni (Android 13+)
    await Permission.notification.request();
    
    // Konum İzni
    var status = await Permission.location.request();
    if (status.isGranted) {
      // Arka plan izni (Android 10+)
      // Kullanıcıdan "Her zaman izin ver" seçmesini istemek gerekebilir
      await Permission.locationAlways.request();
      await Permission.ignoreBatteryOptimizations.request();
      // GPS Servisini Başlat (Sadece Mobil ve Admin Değilse)
      final user = Provider.of<AuthService>(context, listen: false).user;
      if (!kIsWeb && user?['role'] != 'admin') {
        await initializeService();
      }
    }
  }

  Future<void> _fetchStats() async {
    final authService = Provider.of<AuthService>(context, listen: false);
    final url = Uri.parse('${AuthService.baseUrl}/api/stats/user');
    
    try {
      final response = await http.get(url, headers: {
        'Authorization': 'Bearer ${authService.token}'
      });

      if (response.statusCode == 200) {
        setState(() {
          _stats = jsonDecode(response.body);
        });
      }
    } catch (e) {
      print('İstatistik yükleme hatası: $e');
    } finally {
      if (mounted) setState(() => _isLoadingStats = false);
    }
  }

  void _connectSocket() {
    final auth = Provider.of<AuthService>(context, listen: false);
    if (auth.token != null) {
      Provider.of<SocketService>(context, listen: false).connect(AuthService.baseUrl, auth.token!);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = Provider.of<AuthService>(context).user;
    
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Merhaba, ${user?['name'] ?? ''}', style: const TextStyle(fontSize: 16)),
            const Text('Atılım Gıda', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Color(0xFFE65100))),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () {
               Provider.of<AuthService>(context, listen: false).logout();
               Navigator.pushReplacementNamed(context, '/login');
            },
          )
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // İstatistik Kartı (Haftalık Tahsilat)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(colors: [Color(0xFFE65100), Color(0xFFFF9800)]),
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(color: Colors.orange.withOpacity(0.3), blurRadius: 15, offset: const Offset(0, 8))
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Haftalık Tahsilat', style: TextStyle(color: Colors.white, fontSize: 16)),
                  const SizedBox(height: 10),
                  _isLoadingStats 
                   ? const CircularProgressIndicator(color: Colors.white)
                   : Text('₺ ${(_stats['weekly'] ?? 0).toStringAsFixed(2)}', style: const TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                        decoration: BoxDecoration(color: Colors.white.withOpacity(0.2), borderRadius: BorderRadius.circular(10)),
                        child: const Text('Bu Hafta', style: TextStyle(color: Colors.white)),
                      ),
                      const SizedBox(width: 10),
                      const Text('Pazartesiden itibaren', style: TextStyle(color: Colors.white70, fontSize: 12)),
                    ],
                  )
                ],
              ),
            ),
            
            const SizedBox(height: 30),
            
            // Grid Menü
            GridView.count(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisCount: 2,
              crossAxisSpacing: 16,
              mainAxisSpacing: 16,
              children: [
                _buildMenuCard(
                  icon: Icons.add_chart, 
                  title: 'Yeni Rapor', 
                  color: const Color(0xFF00E5FF),
                  onTap: () {
                    Navigator.push(context, MaterialPageRoute(builder: (_) => const ReportScreen()))
                        .then((value) {
                      if (value == true) {
                        _fetchStats();
                      }
                    });
                  }
                ),
                _buildMenuCard(
                  icon: Icons.history, 
                  title: 'Geçmiş Raporlar', 
                  color: const Color(0xFF76FF03),
                  onTap: () {
                    Navigator.push(context, MaterialPageRoute(builder: (_) => const UserReportsScreen()));
                  }
                ),
                _buildMenuCard(
                  icon: Icons.person, 
                  title: 'Hesabım', 
                  color: const Color(0xFFFFD740),
                  onTap: () {
                    Navigator.push(context, MaterialPageRoute(builder: (_) => const AccountScreen()));
                  }
                ),
                _buildMenuCard(
                  icon: Icons.analytics, 
                  title: 'İstatistikler', 
                  color: const Color(0xFFEA80FC),
                  onTap: () {}
                ),
                if (user != null && user['role'] == 'admin')
                  _buildMenuCard(
                    icon: Icons.map, 
                    title: 'Canlı Harita', 
                    color: Colors.redAccent,
                    onTap: () {
                      Navigator.push(context, MaterialPageRoute(builder: (_) => const AdminMapScreen()));
                    }
                  ),
              ],
            ),
            
            const SizedBox(height: 20),
            
             // Sohbet Butonu (FAB yerine card tasarımı içinde de olabilir)
             // Ancak user chat istiyor, alt tarafa bir chat alanı ekleyelim.
          ],
        ),
      ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
           Navigator.push(
            context,
            MaterialPageRoute(
               builder: (context) => const AdminListScreen()
            )
           );
        },
        backgroundColor: const Color(0xFFE65100),
        child: const Icon(Icons.chat_bubble_outline),
      ),
    );
  }

  Widget _buildMenuCard({required IconData icon, required String title, required Color color, required VoidCallback onTap}) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: const Color(0xFF2C2C2C),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Colors.white.withOpacity(0.05)),
          boxShadow: [
            BoxShadow(color: Colors.black.withOpacity(0.2), blurRadius: 10)
          ],
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: color.withOpacity(0.2),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: color, size: 32),
            ),
            const SizedBox(height: 16),
            Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          ],
        ),
      ),
    );
  }
}
