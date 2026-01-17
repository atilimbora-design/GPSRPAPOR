import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:window_manager/window_manager.dart';
import '../services/auth_service.dart';
import 'admin_map_screen.dart';
import 'admin_reports_screen.dart';
import 'admin_users_screen.dart';
import 'login_screen.dart';

class AdminDashboardScreen extends StatefulWidget {
  const AdminDashboardScreen({super.key});

  @override
  State<AdminDashboardScreen> createState() => _AdminDashboardScreenState();
}

class _AdminDashboardScreenState extends State<AdminDashboardScreen> {
  int _selectedIndex = 0;

  // Sayfalar
  final List<Widget> _pages = [
    const AdminMapScreen(), // Mevcut harita ekranı
    const AdminReportsScreen(),
    const AdminUsersScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    bool isDesktop = MediaQuery.of(context).size.width >= 800;

    return Scaffold(
      backgroundColor: const Color(0xFF121212),
      appBar: !isDesktop
          ? AppBar(
              backgroundColor: const Color(0xFF1E1E1E),
              title: const Text('Yönetici Paneli', style: TextStyle(color: Colors.white)),
              iconTheme: const IconThemeData(color: Colors.white),
            )
          : null,
      drawer: !isDesktop
          ? Drawer(
              backgroundColor: const Color(0xFF1E1E1E),
              child: _buildSidebarContent(),
            )
          : null,
      body: Row(
        children: [
          // Sol Menü (Sadece Desktop)
          if (isDesktop)
            Container(
              width: 250,
              color: const Color(0xFF1E1E1E),
              child: _buildSidebarContent(),
            ),
          
          // Ana İçerik
          Expanded(
            child: _pages[_selectedIndex],
          ),
        ],
      ),
    );
  }

  Widget _buildSidebarContent() {
    return Column(
      children: [
        // Logo ve Başlık
        Container(
          padding: const EdgeInsets.symmetric(vertical: 40),
          child: Column(
            children: [
              const Icon(Icons.shield_outlined,
                  size: 50, color: Color(0xFFE65100)),
              const SizedBox(height: 10),
              const Text(
                'YÖNETİCİ PANELİ',
                style: TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 1),
              ),
              const SizedBox(height: 5),
              Text(
                Provider.of<AuthService>(context).user?['name'] ?? 'Admin',
                style: const TextStyle(color: Colors.white54, fontSize: 14),
              ),
            ],
          ),
        ),
        
        // Menü Öğeleri
        _buildMenuItem(0, Icons.map, 'Canlı Harita'),
        _buildMenuItem(1, Icons.assignment, 'Raporlar & Finans'),
        _buildMenuItem(2, Icons.people, 'Personel Yönetimi'),
        
        const Spacer(),
        
        // Çıkış Butonu
        _buildMenuItem(3, Icons.exit_to_app, 'Çıkış Yap', isLogout: true),
        const SizedBox(height: 20),
      ],
    );
  }

  Widget _buildMenuItem(int index, IconData icon, String title, {bool isLogout = false}) {
    final isSelected = _selectedIndex == index;
    return InkWell(
      onTap: () async {
        if (isLogout) {
          await Provider.of<AuthService>(context, listen: false).logout();
          if (mounted) Navigator.pushReplacementNamed(context, '/login');
        } else {
          setState(() {
            _selectedIndex = index;
          });
        }
      },
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 20),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFFE65100).withOpacity(0.2) : null,
          border: isSelected
              ? const Border(left: BorderSide(color: Color(0xFFE65100), width: 4))
              : null,
        ),
        child: Row(
          children: [
            Icon(icon, color: isSelected || isLogout ? const Color(0xFFE65100) : Colors.white70),
            const SizedBox(width: 15),
            Text(
              title,
              style: TextStyle(
                color: isSelected || isLogout ? Colors.white : Colors.white70,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
