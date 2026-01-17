import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../services/auth_service.dart';

class AdminReportsScreen extends StatefulWidget {
  const AdminReportsScreen({super.key});

  @override
  State<AdminReportsScreen> createState() => _AdminReportsScreenState();
}

class _AdminReportsScreenState extends State<AdminReportsScreen> {
  List<dynamic> _reports = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchReports();
  }

  Future<void> _fetchReports() async {
    final authService = Provider.of<AuthService>(context, listen: false);
    final url = Uri.parse('${AuthService.baseUrl}/api/reports');
    
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
      print('Raporları çekme hatası: $e');
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
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Tüm Raporlar',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                ),
              ),
              ElevatedButton.icon(
                onPressed: _fetchReports,
                icon: const Icon(Icons.refresh),
                label: const Text('Yenile'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFE65100),
                  foregroundColor: Colors.white,
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          Expanded(
            child: _isLoading 
              ? const Center(child: CircularProgressIndicator())
              : SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: SingleChildScrollView(
                    child: DataTable(
                      headingRowColor: MaterialStateProperty.all(Colors.white.withOpacity(0.1)),
                      dataRowColor: MaterialStateProperty.all(Colors.white.withOpacity(0.05)),
                      columns: const [
                        DataColumn(label: Text('Tarih', style: TextStyle(color: Colors.white70))),
                        DataColumn(label: Text('Personel', style: TextStyle(color: Colors.white70))),
                        DataColumn(label: Text('Plaka', style: TextStyle(color: Colors.white70))),
                        DataColumn(label: Text('Toplam Tahsilat', style: TextStyle(color: Colors.white70))),
                        DataColumn(label: Text('Durum', style: TextStyle(color: Colors.white70))),
                        DataColumn(label: Text('İşlem', style: TextStyle(color: Colors.white70))),
                      ],
                      rows: _reports.map((report) {
                        final user = report['User'] ?? {};
                        final total = _calculateTotal(report['collections']);
                        
                        return DataRow(cells: [
                          DataCell(Text(report['date'] ?? '', style: const TextStyle(color: Colors.white))),
                          DataCell(Text('${user['name']} (${user['personelCode']})', style: const TextStyle(color: Colors.white))),
                          DataCell(Text(report['vehiclePlate'] ?? '', style: const TextStyle(color: Colors.white))),
                          DataCell(Text('${total.toStringAsFixed(2)} TL', style: const TextStyle(color: Colors.greenAccent))),
                          DataCell(_buildStatusChip(report['status'] ?? 'pending')),
                          DataCell(IconButton(
                            icon: const Icon(Icons.visibility, color: Colors.blue),
                            onPressed: () {
                              // Detay
                            },
                          )),
                        ]);
                      }).toList(),
                    ),
                  ),
                ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusChip(String status) {
    Color color;
    String label = status;
    switch (status) {
      case 'approved':
        color = Colors.green;
        label = 'Onaylandı';
        break;
      case 'rejected':
        color = Colors.red;
        label = 'Reddedildi';
        break;
      default:
        color = Colors.orange;
        label = 'Bekliyor';
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.2),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color),
      ),
      child: Text(
        label,
        style: TextStyle(color: color, fontSize: 12),
      ),
    );
  }
}
