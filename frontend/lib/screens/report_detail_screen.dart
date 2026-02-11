import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:printing/printing.dart';
import 'package:provider/provider.dart';
import '../services/auth_service.dart';

class ReportDetailScreen extends StatelessWidget {
  final Map<String, dynamic> report;

  const ReportDetailScreen({super.key, required this.report});

  @override
  Widget build(BuildContext context) {
    final collections = report['collections'] is String 
        ?  _parseJson(report['collections']) 
        : report['collections'] ?? {};
    
    final expenses = report['expenses'] is String
        ? _parseJson(report['expenses'])
        : report['expenses'] ?? {};

    return Scaffold(
      backgroundColor: const Color(0xFF121212),
      appBar: AppBar(
        title: Text('${report['date']} Rapor Detayı'),
        backgroundColor: const Color(0xFFE65100),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildSectionHeader('Genel Bilgiler'),
            _buildInfoRow('Tarih', report['date']),
            _buildInfoRow('Plaka', report['vehiclePlate']),
            _buildInfoRow('KM Başlangıç', report['startKm']),
            _buildInfoRow('KM Bitiş', report['endKm']),
            const Divider(),
            
            _buildSectionHeader('Tahsilat'),
            _buildInfoRow('Nakit', '${collections['cash'] ?? 0} TL'),
            _buildInfoRow('Kredi Kartı', '${collections['creditCard'] ?? 0} TL'),
            _buildInfoRow('Çek', '${collections['check'] ?? 0} TL'),
            _buildInfoRow('EFT', '${collections['eft'] ?? 0} TL'),
            const Divider(),

            _buildSectionHeader('Giderler'),
            if (expenses['fuel'] != null)
              _buildExpenseRow('Yakıt', expenses['fuel']['amount'], expenses['fuel']['desc']),
            if (expenses['maintenance'] != null)
              _buildExpenseRow('Tamir/Bakım', expenses['maintenance']['amount'], expenses['maintenance']['desc']),
            if (expenses['other'] != null)
              _buildExpenseRow('Diğer', expenses['other']['amount'], expenses['other']['desc']),
             
             const Divider(),
             _buildSectionHeader('Teslimat'),
             _buildInfoRow('Muhasebeye Teslim', '${report['cashDelivered'] ?? 0} TL'),
             
             const SizedBox(height: 20),
             // PDF veya Resim Görüntüleme Butonları Eklenebilir
             if (report['pdfPath'] != null)
               ElevatedButton.icon(
                 onPressed: () => _viewPdf(context),
                 icon: const Icon(Icons.picture_as_pdf),
                 label: const Text('PDF Görüntüle')
               ),
          ],
        ),
      ),
    );
  }

  Map<String, dynamic> _parseJson(String jsonStr) {
    try {
      return jsonDecode(jsonStr);
    } catch (e) {
      return {};
    }
  }

  Future<void> _viewPdf(BuildContext context) async {
    final authService = Provider.of<AuthService>(context, listen: false);
    final reportId = report['id'];
    if (reportId == null) return;

    final url = Uri.parse('${AuthService.baseUrl}/api/reports/$reportId/pdf');
    try {
      final response = await http.get(
        url,
        headers: {'Authorization': 'Bearer ${authService.token}'},
      );

      if (response.statusCode == 200) {
        final bytes = response.bodyBytes;
        await Printing.layoutPdf(onLayout: (_) => bytes);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('PDF yüklenemedi: ${response.statusCode}')),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('PDF hatası: $e')),
      );
    }
  }

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Text(title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.orange)),
    );
  }

  Widget _buildInfoRow(String label, dynamic value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontWeight: FontWeight.w500, color: Colors.white70)),
          Text(value?.toString() ?? '-', style: const TextStyle(color: Colors.white)),
        ],
      ),
    );
  }

  Widget _buildExpenseRow(String type, dynamic amount, String? desc) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(type, style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
              if (desc != null && desc.isNotEmpty)
                Text(desc, style: const TextStyle(fontSize: 12, color: Colors.white54)),
            ],
          ),
          Text('${amount ?? 0} TL', style: const TextStyle(color: Colors.white)),
        ],
      ),
    );
  }
}
