import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:window_manager/window_manager.dart';
import '../services/auth_service.dart';
import 'admin_map_screen.dart';
import 'admin_reports_screen.dart';
import 'admin_users_screen.dart';
import 'admin_chat_panel_screen.dart';
import 'admin_live_tracking_screen.dart';
import '../providers/admin_navigation_provider.dart';
import '../services/socket_service.dart';

class AdminDashboardScreen extends StatefulWidget {
  const AdminDashboardScreen({super.key});

  @override
  State<AdminDashboardScreen> createState() => _AdminDashboardScreenState();
}

class _AdminDashboardScreenState extends State<AdminDashboardScreen> {

  @override
  void initState() {
    super.initState();
    _connectSocket();
  }

  Future<void> _connectSocket() async {
    final authService = Provider.of<AuthService>(context, listen: false);
    final socketService = Provider.of<SocketService>(context, listen: false);
    
    final token = authService.token;
    if (token != null) {
      socketService.connect(AuthService.baseUrl, token);
    }
  }

  // Sayfalar
  final List<Widget> _pages = [
    const AdminMapScreen(),
    const AdminLiveTrackingScreen(),
    const AdminReportsScreen(),
    const AdminUsersScreen(),
    const AdminChatPanelScreen(), // This will be dynamically replaced if chat params are set
  ];

  @override
  Widget build(BuildContext context) {
    bool isDesktop = MediaQuery.of(context).size.width >= 800;
    final navProvider = Provider.of<AdminNavigationProvider>(context);

    // Initial parameters for chat screen if selected
    if (navProvider.selectedIndex == 4 && navProvider.chatUserId != null) {
        // Chat parametrelerini chat ekranına pass etmek için buraya logic gerekebilir
        // Ancak AdminChatPanelScreen zaten parametre alıyor.
        // O yüzden listeyi dinamik yapmak daha iyi olabilir:
    }
    
    // Sayfaları yeniden build etmek yerine parametre geçirebileceğimiz bir yapı:
    Widget activePage;
    if (navProvider.selectedIndex == 4) {
      activePage = AdminChatPanelScreen(
        key: ValueKey('chat_${navProvider.chatUserId}'), // Force rebuild if user changes
        initialUserId: navProvider.chatUserId,
        initialUserName: navProvider.chatUserName,
      );
    } else {
      activePage = _pages[navProvider.selectedIndex];
    }

    return Scaffold(
      backgroundColor: const Color(0xFFF0F2F5), // Açık gri
      appBar: !isDesktop
          ? AppBar(
              backgroundColor: Colors.white,
              title: const Text('Yönetici Paneli', style: TextStyle(color: Colors.black)),
              iconTheme: const IconThemeData(color: Colors.black),
              elevation: 1,
            )
          : null,
      drawer: !isDesktop
          ? Drawer(
              backgroundColor: Colors.white,
              child: _buildSidebarContent(navProvider),
            )
          : null,
      body: Row(
        children: [
          // Sol Menü (Sadece Desktop)
          if (isDesktop)
            Container(
              width: 250,
              decoration: BoxDecoration(
                color: Colors.white,
                boxShadow: [
                  BoxShadow(
                    color: Colors.grey.withOpacity(0.1),
                    blurRadius: 10,
                    offset: const Offset(2, 0),
                  )
                ],
              ),
              child: _buildSidebarContent(navProvider),
            ),
          
          // Ana İçerik
          Expanded(
            child: activePage,
          ),
        ],
      ),
    );
  }

  Widget _buildSidebarContent(AdminNavigationProvider navProvider) {
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
                    color: Colors.black87,
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 1.2),
              ),
              const SizedBox(height: 5),
              Text(
                'Bora', // Kullanıcı adı buraya gelebilir
                style: TextStyle(color: Colors.grey.shade600, fontSize: 14),
              ),
            ],
          ),
        ),
        
        // Menü Öğeleri
        _buildMenuItem(Icons.map, 'Canlı Harita', 0, navProvider),
        _buildMenuItem(Icons.gps_fixed, 'Akıcı Takip', 1, navProvider),
        _buildMenuItem(Icons.analytics, 'Raporlar & Finans', 2, navProvider),
        _buildMenuItem(Icons.people, 'Personel Yönetimi', 3, navProvider),
        _buildMenuItem(Icons.message, 'Mesajlar', 4, navProvider),
        
        const Spacer(),
        
        // Alt Butonlar
        _buildMenuItem(Icons.close_fullscreen, 'Pencere Modu', -1, navProvider, onTap: () async {
            if (await windowManager.isFullScreen()) {
              await windowManager.setFullScreen(false);
            } else {
              await windowManager.setFullScreen(true);
            }
        }),
        _buildMenuItem(Icons.logout, 'Çıkış Yap', -1, navProvider, onTap: () {
          Provider.of<AuthService>(context, listen: false).logout();
          Navigator.pushReplacementNamed(context, '/login');
        }),
        
        const SizedBox(height: 20),
      ],
    );
  }

  Widget _buildMenuItem(IconData icon, String title, int index, AdminNavigationProvider navProvider, {VoidCallback? onTap}) {
    final isSelected = navProvider.selectedIndex == index && index != -1;
    
    return InkWell(
      onTap: onTap ?? () {
        navProvider.setIndex(index);
        // Clear chat params when switching tabs (optional, but cleaner)
        if (index != 4) {
           navProvider.clearChatParams();
        }
      },
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 24),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFFE65100).withOpacity(0.1) : Colors.transparent,
          border: isSelected 
            ? const Border(left: BorderSide(color: Color(0xFFE65100), width: 4))
            : null,
        ),
        child: Row(
          children: [
            Icon(
              icon,
              color: isSelected ? const Color(0xFFE65100) : Colors.black54,
              size: 24,
            ),
            const SizedBox(width: 16),
            Text(
              title,
              style: TextStyle(
                color: isSelected ? const Color(0xFFE65100) : Colors.black87,
                fontSize: 16,
                fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
