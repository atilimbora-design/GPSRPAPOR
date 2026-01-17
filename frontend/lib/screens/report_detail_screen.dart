import 'dart:convert';
import 'package:flutter/material.dart';
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
              _buildExpenseRow('Yakıt', expenses['fuel']['amount'], expenses['fuel']['description']),
            if (expenses['food'] != null)
              _buildExpenseRow('Yemek', expenses['food']['amount'], expenses['food']['description']),
             if (expenses['hotel'] != null)
              _buildExpenseRow('Otel', expenses['hotel']['amount'], expenses['hotel']['description']),
             if (expenses['maintenance'] != null)
              _buildExpenseRow('Tamir/Bakım', expenses['maintenance']['amount'], expenses['maintenance']['description']),
            if (expenses['other'] != null)
              _buildExpenseRow('Diğer', expenses['other']['amount'], expenses['other']['description']),
             
             const Divider(),
             _buildSectionHeader('Teslimat'),
             _buildInfoRow('Muhasebeye Teslim', '${report['cashDelivered'] ?? 0} TL'),
             
             const SizedBox(height: 20),
             // PDF veya Resim Görüntüleme Butonları Eklenebilir
             if (report['pdfPath'] != null)
               ElevatedButton.icon(
                 onPressed: () {
                    // PDF Açma mantığı (url_launcher eklenecek)
                 }, 
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
          Text(label, style: const TextStyle(fontWeight: FontWeight.w500)),
          Text(value?.toString() ?? '-', style: const TextStyle(color: Colors.black87)),
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
              Text(type, style: const TextStyle(fontWeight: FontWeight.bold)),
              if (desc != null && desc.isNotEmpty)
                Text(desc, style: const TextStyle(fontSize: 12, color: Colors.grey)),
            ],
          ),
          Text('${amount ?? 0} TL'),
        ],
      ),
    );
  }
}
