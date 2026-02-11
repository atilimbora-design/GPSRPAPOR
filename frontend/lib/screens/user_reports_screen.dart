import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../services/auth_service.dart';

import 'report_detail_screen.dart';

class UserReportsScreen extends StatefulWidget {
  const UserReportsScreen({super.key});

  @override
  State<UserReportsScreen> createState() => _UserReportsScreenState();
}

class _UserReportsScreenState extends State<UserReportsScreen> {
  List<dynamic> _reports = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchReports();
  }

  Future<void> _fetchReports() async {
    final authService = Provider.of<AuthService>(context, listen: false);
    final url = Uri.parse('${AuthService.baseUrl}/api/reports/user');
    
    try {
      final response = await http.get(url, headers: {
        'Authorization': 'Bearer ${authService.token}'
      });

      if (response.statusCode == 200) {
        setState(() {
          _reports = jsonDecode(response.body);
        });
      }
    } catch (e) {
      print('Rapor geçmişi hatası: $e');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  double _calculateTotal(dynamic collections) {
    if (collections == null) return 0.0;
    try {
      final col = collections is String ? jsonDecode(collections) : collections;
      double total = 0;
      total += (double.tryParse(col['cash'].toString()) ?? 0);
      total += (double.tryParse(col['creditCard'].toString()) ?? 0);
      total += (double.tryParse(col['check'].toString()) ?? 0);
      total += (double.tryParse(col['eft'].toString()) ?? 0);
      return total;
    } catch (e) {
      return 0.0;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Geçmiş Raporlarım'),
        backgroundColor: const Color(0xFFE65100),
      ),
      body: _isLoading 
        ? const Center(child: CircularProgressIndicator())
        : _reports.isEmpty 
          ? const Center(child: Text('Henüz raporunuz bulunmuyor.'))
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: _reports.length,
              itemBuilder: (context, index) {
                final report = _reports[index];
                final total = _calculateTotal(report['collections']);
                final date = report['date'] ?? '-';
                final status = report['status'] ?? 'pending';

                return Card(
                  margin: const EdgeInsets.only(bottom: 10),
                  child: ListTile(
                    leading: CircleAvatar(
                      backgroundColor: status == 'approved' ? Colors.green : Colors.orange,
                      child: Icon(
                        status == 'approved' ? Icons.check : Icons.access_time, 
                        color: Colors.white
                      ),
                    ),
                    title: Text('$date Raporu'),
                    subtitle: Text('${total.toStringAsFixed(2)} TL Tahsilat'),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => ReportDetailScreen(report: report),
                        ),
                      );
                    },
                  ),
                );
              },
            ),
    );
  }
}
