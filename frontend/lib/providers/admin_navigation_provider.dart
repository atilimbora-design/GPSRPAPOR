import 'package:flutter/material.dart';

class AdminNavigationProvider with ChangeNotifier {
  int _selectedIndex = 0;
  int get selectedIndex => _selectedIndex;

  // Chat parametreleri
  int? _chatUserId;
  String? _chatUserName;

  int? get chatUserId => _chatUserId;
  String? get chatUserName => _chatUserName;

  void setIndex(int index) {
    _selectedIndex = index;
    notifyListeners();
  }

  void openChatWithUser(int userId, String userName) {
    _selectedIndex = 4; // Chat Panel Index (AdminDashboardScreen içinde 4. sırada)
    _chatUserId = userId;
    _chatUserName = userName;
    notifyListeners();
  }

  void clearChatParams() {
    _chatUserId = null;
    _chatUserName = null;
  }
}
