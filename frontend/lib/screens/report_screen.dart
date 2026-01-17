import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../services/auth_service.dart';

class ReportScreen extends StatefulWidget {
  const ReportScreen({super.key});

  @override
  State<ReportScreen> createState() => _ReportScreenState();
}

class _ReportScreenState extends State<ReportScreen> {
  final _formKey = GlobalKey<FormState>();
  
  // Controllers
  final _startKmController = TextEditingController();
  final _endKmController = TextEditingController();
  final _cashController = TextEditingController();
  final _ccController = TextEditingController();
  final _checkController = TextEditingController();
  final _eftController = TextEditingController();
  final _descController = TextEditingController();

  double get _totalCollection {
    double cash = double.tryParse(_cashController.text) ?? 0;
    double cc = double.tryParse(_ccController.text) ?? 0;
    double check = double.tryParse(_checkController.text) ?? 0;
    double eft = double.tryParse(_eftController.text) ?? 0;
    return cash + cc + check + eft;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Yeni Rapor Oluştur')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildSectionHeader('Araç Bilgileri'),
              Row(
                children: [
                   Expanded(child: _buildTextField(_startKmController, 'Başlangıç KM', icon: Icons.speed, isNumber: true)),
                   const SizedBox(width: 10),
                   Expanded(child: _buildTextField(_endKmController, 'Bitiş KM', icon: Icons.speed, isNumber: true)),
                ],
              ),
              
              const SizedBox(height: 20),
              _buildSectionHeader('Tahsilatlar'),
              _buildTextField(_cashController, 'Nakit Tahsilat (TL)', icon: Icons.attach_money, isNumber: true, onChanged: (_) => setState((){})),
              const SizedBox(height: 10),
              _buildTextField(_ccController, 'Kredi Kartı', icon: Icons.credit_card, isNumber: true, onChanged: (_) => setState((){})),
              const SizedBox(height: 10),
              _buildTextField(_checkController, 'Çek', icon: Icons.note, isNumber: true, onChanged: (_) => setState((){})),
              const SizedBox(height: 10),
              _buildTextField(_eftController, 'EFT / Havale', icon: Icons.account_balance, isNumber: true, onChanged: (_) => setState((){})),
              
              const SizedBox(height: 20),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFFE65100).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFE65100)),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('TOPLAM TAHSİLAT:', style: TextStyle(fontWeight: FontWeight.bold)),
                    Text('₺ ${_totalCollection.toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: Color(0xFFE65100))),
                  ],
                ),
              ),

              const SizedBox(height: 20),
              _buildSectionHeader('Diğer'),
              _buildTextField(_descController, 'Açıklama / Notlar', icon: Icons.description, maxLines: 3),

              const SizedBox(height: 30),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () {
                    // Kaydet ve PDF Oluştur Mantığı
                  },
                  icon: const Icon(Icons.save),
                  label: const Text('KAYDET VE GÖNDER'),
                ),
              )
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Text(title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white70)),
    );
  }

  Widget _buildTextField(TextEditingController controller, String label, {IconData? icon, bool isNumber = false, int maxLines = 1, Function(String)? onChanged}) {
    return TextFormField(
      controller: controller,
      keyboardType: isNumber ? TextInputType.number : TextInputType.text,
      maxLines: maxLines,
      onChanged: onChanged,
      style: const TextStyle(color: Colors.white),
      decoration: InputDecoration(
        labelText: label,
        prefixIcon: icon != null ? Icon(icon, color: Colors.white54) : null,
        labelStyle: const TextStyle(color: Colors.white54),
      ),
    );
  }
}
