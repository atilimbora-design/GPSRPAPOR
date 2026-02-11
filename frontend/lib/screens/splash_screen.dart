import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'dart:async';
import '../services/auth_service.dart';
import '../services/update_service.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> with SingleTickerProviderStateMixin {
  double _progress = 0.0;
  int _textIndex = 0;
  final List<String> _loadingTexts = [
    'Sunucuya Bağlanılıyor...',
    'Dev by Bora Uğur',
    'Atılım Gıda'
  ];
  Map<String, dynamic>? _user;
  Timer? _textTimer;
  Timer? _progressTimer;

  @override
  void initState() {
    super.initState();
    _checkAuth();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _checkUpdateThenStart();
    });
  }

  Future<void> _checkUpdateThenStart() async {
    try {
      final authService = Provider.of<AuthService>(context, listen: false);
      if (authService.token != null) {
        final updateService = UpdateService();
        await updateService.checkForUpdates(AuthService.baseUrl, authService.token!);
      }
    } catch (e) {
      print('Update check error: $e');
    }
    if (!mounted) return;
    _startLoading();
  }

  Future<void> _checkAuth() async {
    final authService = Provider.of<AuthService>(context, listen: false);
    await authService.checkLoginStatus(); // Token varsa user'ı yükle
    if (mounted) {
      setState(() {
        _user = authService.user;
      });
    }
  }

  void _startLoading() {
    // 5 saniyede dolacak progress bar
    // Her 50ms'de %1 artır (100 adım * 50ms = 5000ms = 5s)
    _progressTimer = Timer.periodic(const Duration(milliseconds: 50), (timer) {
      if (mounted) {
        setState(() {
          _progress += 0.01;
        });
        if (_progress >= 1.0) {
          timer.cancel();
          _navigate();
        }
      }
    });

    // Yazı döngüsü: Toplam 5 saniye. 3 yazı var.
    // 5000 / 3 ~= 1666ms. Her yazı ~1.6sn ekranda kalsın.
    _textTimer = Timer.periodic(const Duration(milliseconds: 1600), (timer) {
      if (mounted) {
        setState(() {
          _textIndex = (_textIndex + 1) % _loadingTexts.length;
        });
      }
    });
  }

  void _navigate() {
    _textTimer?.cancel();
    final authService = Provider.of<AuthService>(context, listen: false);
    if (authService.isAuthenticated) {
       if (authService.user?['role'] == 'admin') {
         Navigator.pushReplacementNamed(context, '/admin-dashboard');
       } else {
         Navigator.pushReplacementNamed(context, '/home');
       }
    } else {
      Navigator.pushReplacementNamed(context, '/login');
    }
  }

  @override
  void dispose() {
    _textTimer?.cancel();
    _progressTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        width: double.infinity,
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0xFF0F2027), Color(0xFF203A43), Color(0xFF2C5364)],
          ),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Spacer(),
            
            // Profil Fotoğrafı veya Logo
            Container(
              width: 120,
              height: 120,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.white.withOpacity(0.1),
                border: Border.all(color: Colors.orangeAccent, width: 2),
                image: _user != null && _user!['avatar'] != null // Avatar varsa
                    ? DecorationImage(
                        image: NetworkImage(_user!['avatar']), // İleride Image.network eklenecek
                        fit: BoxFit.cover,
                      )
                    : null,
                boxShadow: const [
                  BoxShadow(color: Colors.black45, blurRadius: 20, offset: Offset(0, 10))
                ]
              ),
              child: _user == null || _user!['avatar'] == null
                  ? const Icon(Icons.person, size: 60, color: Colors.white70)
                  : null,
            ),
            
            const SizedBox(height: 20),
            
            // İsim Soyisim (Varsa)
            Text(
              _user?['name'] ?? 'GPS RAPOR',
              style: const TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: Colors.white,
                letterSpacing: 1.2
              ),
            ),
            
            if (_user != null)
              Padding(
                padding: const EdgeInsets.only(top: 8.0),
                child: Text(
                  _user!['role'] == 'admin' ? 'Yönetici' : 'Personel',
                  style: const TextStyle(color: Colors.white70),
                ),
              ),

            const Spacer(),
            
            // Loading Bar
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 50.0),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(10),
                child: LinearProgressIndicator(
                  value: _progress,
                  backgroundColor: Colors.white24,
                  valueColor: const AlwaysStoppedAnimation<Color>(Colors.orangeAccent),
                  minHeight: 6,
                ),
              ),
            ),
            
            const SizedBox(height: 20),
            
            // Kayan Yazılar
            SizedBox(
              height: 30,
              child: AnimatedSwitcher(
                duration: const Duration(milliseconds: 500),
                child: Text(
                  _loadingTexts[_textIndex],
                  key: ValueKey<int>(_textIndex),
                  style: const TextStyle(
                    fontSize: 14,
                    color: Colors.white54,
                    letterSpacing: 1
                  ),
                ),
              ),
            ),
            
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }
}
