import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/auth_service.dart';
import 'package:shared_preferences/shared_preferences.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> with SingleTickerProviderStateMixin {
  final _usernameController = TextEditingController();
  final _passwordController = TextEditingController();
  late AnimationController _animationController;
  late Animation<double> _fadeAnimation;
  bool _rememberMe = false;
  String? _savedName;
  bool _isWelcomeMode = false;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _checkRememberedUser();
    
    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 1),
    );
    _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(CurvedAnimation(
      parent: _animationController,
      curve: Curves.easeIn,
    ));
    _animationController.forward();
  }

  Future<void> _checkRememberedUser() async {
    final prefs = await SharedPreferences.getInstance();
    final savedUsername = prefs.getString('saved_username');
    final savedName = prefs.getString('saved_name');
    
    if (savedUsername != null && savedName != null) {
      setState(() {
        _usernameController.text = savedUsername;
        _savedName = savedName;
        _isWelcomeMode = true;
        _rememberMe = true;
      });
    }
  }

  Future<void> _clearRememberedUser() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('saved_username');
    await prefs.remove('saved_name');
    setState(() {
      _usernameController.clear();
      _passwordController.clear();
      _savedName = null;
      _isWelcomeMode = false;
      _rememberMe = false;
    });
  }

  @override
  void dispose() {
    _animationController.dispose();
    _usernameController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFF0F2027), Color(0xFF203A43), Color(0xFF2C5364)],
          ),
        ),
        child: SafeArea(
          child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24.0),
            child: FadeTransition(
              opacity: _fadeAnimation,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // Logo Alanı
                  Container(
                    width: 120,
                    height: 120,
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.1),
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.3),
                          blurRadius: 20,
                          offset: const Offset(0, 10),
                        ),
                      ],
                    ),
                    child: _isWelcomeMode 
                      ? const Icon(Icons.account_circle, size: 80, color: Colors.orange) // Profil fotosu gelince burası değişecek
                      : const Icon(Icons.location_on_outlined, size: 60, color: Color(0xFFE65100)),
                  ),
                  const SizedBox(height: 30),
                  
                  if (_isWelcomeMode) ...[
                     Text(
                      'Hoş Geldin,',
                      style: TextStyle(fontSize: 18, color: Colors.white70),
                    ),
                    Text(
                      _savedName ?? '',
                      style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Colors.white),
                    ),
                  ] else ...[
                    const Text(
                      'GPS TEST',
                      style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold, letterSpacing: 2, color: Colors.white),
                    ),
                    const Text(
                      'Saha Yönetim Sistemi',
                      style: TextStyle(fontSize: 16, color: Colors.white70),
                    ),
                  ],

                  const SizedBox(height: 50),
                  
                  // Login Formu
                  ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 400),
                    child: Container(
                      padding: const EdgeInsets.all(24),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: Colors.white.withOpacity(0.2)),
                        boxShadow: [
                          BoxShadow(color: Colors.black.withOpacity(0.2), blurRadius: 15),
                        ],
                      ),
                      child: Column(
                        children: [
                          if (!_isWelcomeMode)
                            TextField(
                              controller: _usernameController,
                              style: const TextStyle(color: Colors.white),
                              decoration: InputDecoration(
                                hintText: 'Personel ID (örn: 01) veya Admin',
                                hintStyle: TextStyle(color: Colors.white.withOpacity(0.5)),
                                prefixIcon: const Icon(Icons.person_outline, color: Color(0xFFE65100)),
                                filled: true,
                                fillColor: Colors.black12,
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
                              ),
                            ),
                          
                          if (!_isWelcomeMode) const SizedBox(height: 20),
                          
                          TextField(
                            controller: _passwordController,
                            obscureText: true,
                            style: const TextStyle(color: Colors.white),
                            decoration: InputDecoration(
                              hintText: 'Şifre',
                              hintStyle: TextStyle(color: Colors.white.withOpacity(0.5)),
                              prefixIcon: const Icon(Icons.lock_outline, color: Color(0xFFE65100)),
                              filled: true,
                              fillColor: Colors.black12,
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
                            ),
                          ),
                          
                          const SizedBox(height: 15),
                          
                          if (!_isWelcomeMode)
                            Row(
                              children: [
                                Checkbox(
                                  value: _rememberMe, 
                                  activeColor: Colors.orange,
                                  onChanged: (val) => setState(() => _rememberMe = val ?? false)
                                ),
                                const Text('Beni Hatırla', style: TextStyle(color: Colors.white)),
                              ],
                            ),

                          const SizedBox(height: 20),
                          
                          SizedBox(
                            width: double.infinity,
                            height: 50,
                            child: ElevatedButton(
                              onPressed: _isLoading ? null : _login,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFFE65100),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                              ),
                              child: _isLoading
                                  ? const CircularProgressIndicator(color: Colors.white)
                                  : const Text('GİRİŞ YAP', style: TextStyle( fontSize: 16, color: Colors.white, fontWeight: FontWeight.bold)),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  
                  if (_isWelcomeMode)
                    Padding(
                      padding: const EdgeInsets.only(top: 20),
                      child: TextButton(
                        onPressed: _clearRememberedUser,
                        child: const Text('Başka hesapla giriş yap', style: TextStyle(color: Colors.orangeAccent)),
                      ),
                    ),

                  const SizedBox(height: 30),
                  const Text('© 2026 Atılım Gıda', style: TextStyle(color: Colors.white30, fontSize: 12)),
                ],
              ),
            ),
          ),
        ),
      ),
      ),
    );
  }

  Future<void> _login() async {
    setState(() => _isLoading = true);
    
    final username = _usernameController.text.trim();
    final password = _passwordController.text.trim();

    if (username.isEmpty || password.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Lütfen şifrenizi girin')));
      setState(() => _isLoading = false);
      return;
    }

    try {
      final success = await Provider.of<AuthService>(context, listen: false).login(username, password);
      if (success) {
        if (mounted) {
           final user = Provider.of<AuthService>(context, listen: false).user;
           
           // Hatırla Logic
           final prefs = await SharedPreferences.getInstance();
           if (_rememberMe && user != null) {
             await prefs.setString('saved_username', username);
             await prefs.setString('saved_name', user['name'] ?? 'Kullanıcı');
           } else if (!_rememberMe) {
             await _clearRememberedUser();
           }

           if (user != null && user['role'] == 'admin') {
             Navigator.pushReplacementNamed(context, '/admin-dashboard');
           } else {
             Navigator.pushReplacementNamed(context, '/home');
           }
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Giriş başarısız. Şifreyi kontrol edin.')));
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Hata: $e')));
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }
}
