import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../services/auth_service.dart';
import 'report_detail_screen.dart';

class AdminReportsScreen extends StatefulWidget {
  const AdminReportsScreen({super.key});

  @override
  State<AdminReportsScreen> createState() => _AdminReportsScreenState();
}

class _AdminReportsScreenState extends State<AdminReportsScreen> {
  List<dynamic> _reports = [];
  bool _isLoading = true;
  String _timeFilter = 'month';
  DateTimeRange? _customRange;
  int? _selectedUserId;

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

  DateTime _startOfWeek(DateTime date) {
    final weekday = date.weekday; // Mon=1
    return DateTime(date.year, date.month, date.day).subtract(Duration(days: weekday - 1));
  }

  bool _isWithinRange(DateTime date, DateTime start, DateTime end) {
    return (date.isAtSameMomentAs(start) || date.isAfter(start)) &&
        (date.isAtSameMomentAs(end) || date.isBefore(end));
  }

  List<dynamic> _filteredReports() {
    final now = DateTime.now();
    DateTime? start;
    DateTime? end;

    if (_timeFilter == 'today') {
      start = DateTime(now.year, now.month, now.day);
      end = DateTime(now.year, now.month, now.day, 23, 59, 59);
    } else if (_timeFilter == 'week') {
      start = _startOfWeek(now);
      end = DateTime(now.year, now.month, now.day, 23, 59, 59);
    } else if (_timeFilter == 'month') {
      start = DateTime(now.year, now.month, 1);
      end = DateTime(now.year, now.month + 1, 0, 23, 59, 59);
    } else if (_timeFilter == 'year') {
      start = DateTime(now.year, 1, 1);
      end = DateTime(now.year, 12, 31, 23, 59, 59);
    } else if (_timeFilter == 'custom' && _customRange != null) {
      start = _customRange!.start;
      end = DateTime(_customRange!.end.year, _customRange!.end.month, _customRange!.end.day, 23, 59, 59);
    }

    return _reports.where((report) {
      if (_selectedUserId != null && report['User']?['id'] != _selectedUserId) {
        return false;
      }
      final dateStr = report['date'] ?? '';
      final reportDate = DateTime.tryParse(dateStr);
      if (reportDate == null) return false;
      if (start != null && end != null) {
        return _isWithinRange(reportDate, start, end);
      }
      return true;
    }).toList();
  }

  double _sumCollections(List<dynamic> reports) {
    return reports.fold(0.0, (sum, r) => sum + _calculateTotal(r['collections']));
  }

  double _sumForRange(DateTime start, DateTime end) {
    final list = _reports.where((report) {
      if (_selectedUserId != null && report['User']?['id'] != _selectedUserId) {
        return false;
      }
      final dateStr = report['date'] ?? '';
      final reportDate = DateTime.tryParse(dateStr);
      if (reportDate == null) return false;
      return _isWithinRange(reportDate, start, end);
    }).toList();
    return _sumCollections(list);
  }

  List<Map<String, dynamic>> _userOptions() {
    final users = <int, Map<String, dynamic>>{};
    for (final report in _reports) {
      final user = report['User'];
      if (user != null) {
        users[user['id']] = user;
      }
    }
    final list = users.values.toList();
    list.sort((a, b) => (a['name'] ?? '').compareTo(b['name'] ?? ''));
    return list;
  }

  Future<void> _pickCustomRange() async {
    final now = DateTime.now();
    final range = await showDateRangePicker(
      context: context,
      firstDate: DateTime(now.year - 2),
      lastDate: DateTime(now.year + 1),
    );
    if (range != null) {
      setState(() {
        _customRange = range;
        _timeFilter = 'custom';
      });
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
    final now = DateTime.now();
    final filteredReports = _filteredReports();
    final users = _userOptions();
    final todayStart = DateTime(now.year, now.month, now.day);
    final todayEnd = DateTime(now.year, now.month, now.day, 23, 59, 59);
    final weekStart = _startOfWeek(now);
    final weekEnd = DateTime(now.year, now.month, now.day, 23, 59, 59);
    final monthStart = DateTime(now.year, now.month, 1);
    final monthEnd = DateTime(now.year, now.month + 1, 0, 23, 59, 59);
    final yearStart = DateTime(now.year, 1, 1);
    final yearEnd = DateTime(now.year, 12, 31, 23, 59, 59);

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
          Row(
            children: [
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  _filterChip('Bugün', 'today'),
                  _filterChip('Bu Hafta', 'week'),
                  _filterChip('Bu Ay', 'month'),
                  _filterChip('Bu Yıl', 'year'),
                  _filterChip('Özel Tarih', 'custom', onTap: _pickCustomRange),
                ],
              ),
              const Spacer(),
              DropdownButton<int?>(
                value: _selectedUserId,
                dropdownColor: const Color(0xFF1E1E1E),
                hint: const Text('Personel Seç', style: TextStyle(color: Colors.white70)),
                items: [
                  const DropdownMenuItem<int?>(
                    value: null,
                    child: Text('Tümü', style: TextStyle(color: Colors.white)),
                  ),
                  ...users.map((u) => DropdownMenuItem<int?>(
                        value: u['id'],
                        child: Text('${u['name']} (${u['personelCode']})', style: const TextStyle(color: Colors.white)),
                      ))
                ],
                onChanged: (val) => setState(() => _selectedUserId = val),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              _statCard('Günlük', _sumForRange(todayStart, todayEnd)),
              const SizedBox(width: 12),
              _statCard('Haftalık', _sumForRange(weekStart, weekEnd)),
              const SizedBox(width: 12),
              _statCard('Aylık', _sumForRange(monthStart, monthEnd)),
              const SizedBox(width: 12),
              _statCard('Yıllık', _sumForRange(yearStart, yearEnd)),
              if (_timeFilter == 'custom' && _customRange != null) ...[
                const SizedBox(width: 12),
                _statCard('Seçili Aralık', _sumCollections(filteredReports)),
              ],
            ],
          ),
          Expanded(
            child: _isLoading 
              ? const Center(child: CircularProgressIndicator())
              : SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: SingleChildScrollView(
                    child: DataTable(
                      headingRowColor: WidgetStateProperty.all(Colors.white.withOpacity(0.1)),
                      dataRowColor: WidgetStateProperty.all(Colors.white.withOpacity(0.05)),
                      columns: const [
                        DataColumn(label: Text('Tarih', style: TextStyle(color: Colors.white70))),
                        DataColumn(label: Text('Personel', style: TextStyle(color: Colors.white70))),
                        DataColumn(label: Text('Plaka', style: TextStyle(color: Colors.white70))),
                        DataColumn(label: Text('Toplam Tahsilat', style: TextStyle(color: Colors.white70))),
                        DataColumn(label: Text('Durum', style: TextStyle(color: Colors.white70))),
                        DataColumn(label: Text('İşlem', style: TextStyle(color: Colors.white70))),
                      ],
                      rows: filteredReports.map((report) {
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
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (context) => ReportDetailScreen(report: report),
                                ),
                              );
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

  Widget _filterChip(String label, String value, {VoidCallback? onTap}) {
    final isSelected = _timeFilter == value;
    return ChoiceChip(
      label: Text(label),
      selected: isSelected,
      onSelected: (_) {
        if (value == 'custom') {
          onTap?.call();
        } else {
          setState(() {
            _timeFilter = value;
            _customRange = null;
          });
        }
      },
      selectedColor: const Color(0xFFE65100),
      backgroundColor: Colors.white10,
      labelStyle: TextStyle(color: isSelected ? Colors.white : Colors.white70),
    );
  }

  Widget _statCard(String title, double value) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: const Color(0xFF1E1E1E),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.white10),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: const TextStyle(color: Colors.white70)),
            const SizedBox(height: 6),
            Text(
              '₺ ${value.toStringAsFixed(2)}',
              style: const TextStyle(color: Colors.greenAccent, fontSize: 18, fontWeight: FontWeight.bold),
            ),
          ],
        ),
      ),
    );
  }
}
