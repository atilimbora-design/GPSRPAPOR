import 'dart:io';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:image_picker/image_picker.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart'; // Paylaşım için
import 'package:share_plus/share_plus.dart';

import '../services/auth_service.dart';

import 'package:image_cropper/image_cropper.dart';

class ReportScreen extends StatefulWidget {
  const ReportScreen({super.key});

  @override
  State<ReportScreen> createState() => _ReportScreenState();
}

class _ReportScreenState extends State<ReportScreen> {
  final _formKey = GlobalKey<FormState>();
  final ImagePicker _picker = ImagePicker();
  
  // -- Tarih --
  DateTime _selectedDate = DateTime.now();
  
  // -- Araç Bilgileri --
  final _plateController = TextEditingController();
  final _startKmController = TextEditingController();
  final _endKmController = TextEditingController();
  
  // -- Giderler --
  final _fuelCostController = TextEditingController();
  XFile? _fuelImage;
  
  final _repairDescController = TextEditingController();
  final _repairCostController = TextEditingController();
  XFile? _repairImage;
  
  final _otherDescController = TextEditingController(); // Araç giderleri varsa

  // -- Tahsilatlar --
  final _cashController = TextEditingController();
  final _ccController = TextEditingController();
  final _checkController = TextEditingController();
  final _eftController = TextEditingController();
  
  // -- Teslimat --
  final _deliveredCashController = TextEditingController(); // Teslim edilen nakit
  
  // -- Not --
  final _notesController = TextEditingController();

  // Hesaplamalar
  double get valCash => double.tryParse(_cashController.text) ?? 0;
  double get valCC => double.tryParse(_ccController.text) ?? 0;
  double get valCheck => double.tryParse(_checkController.text) ?? 0;
  double get valEft => double.tryParse(_eftController.text) ?? 0;
  
  double get totalCollection => valCash + valCC + valCheck + valEft;
  
  double get valDelivered => double.tryParse(_deliveredCashController.text) ?? 0;
  double get cashDifference => valDelivered - valCash; // + Fazla, - Eksik

  // Resim Seçme
  Future<void> _pickImage(bool isFuel) async {
    // 1. Eğitim Ekranı (Tutorial)
    bool proceed = await _showTutorial();
    if (!proceed) return;

    // 2. Fotoğraf Çek
    final XFile? image = await _picker.pickImage(source: ImageSource.camera, maxWidth: 1024);
    if (image == null) return;

    // 3. Kırpma İşlemi (Crop)
    CroppedFile? croppedFile = await ImageCropper().cropImage(
      sourcePath: image.path,
      uiSettings: [
        AndroidUiSettings(
            toolbarTitle: 'Fişi Düzenle',
            toolbarColor: const Color(0xFFE65100),
            toolbarWidgetColor: Colors.white,
            initAspectRatio: CropAspectRatioPreset.original,
            lockAspectRatio: false,
            aspectRatioPresets: [
              CropAspectRatioPreset.original,
              CropAspectRatioPreset.square,
              CropAspectRatioPreset.ratio3x2,
              CropAspectRatioPreset.ratio4x3,
              CropAspectRatioPreset.ratio16x9
            ]),
        IOSUiSettings(
          title: 'Fişi Düzenle',
          aspectRatioPresets: [
            CropAspectRatioPreset.original,
            CropAspectRatioPreset.square,
            CropAspectRatioPreset.ratio3x2,
            CropAspectRatioPreset.ratio4x3,
            CropAspectRatioPreset.ratio16x9
          ],
        ),
      ],
    );

    if (croppedFile != null) {
      setState(() {
        if (isFuel) {
          _fuelImage = XFile(croppedFile.path); // ImagePicker XFile tipine dönüştür
        } else {
          _repairImage = XFile(croppedFile.path);
        }
      });
    }
  }

  Future<bool> _showTutorial() async {
    return await showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        backgroundColor: Colors.black.withOpacity(0.9),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20), side: const BorderSide(color: Colors.orange, width: 2)),
        title: const Text('Fiş Çekme Rehberi', style: TextStyle(color: Colors.orange, fontWeight: FontWeight.bold)),
        content: Column(
           mainAxisSize: MainAxisSize.min,
           children: [
             Container(
               height: 150,
               width: double.infinity,
               decoration: BoxDecoration(
                 border: Border.all(color: Colors.white54, style: BorderStyle.solid),
                 borderRadius: BorderRadius.circular(10)
               ),
               child: const Center(child: Icon(Icons.document_scanner, size: 80, color: Colors.white24)),
             ),
             const SizedBox(height: 20),
             const Text("1. Fişi düz bir zemine koyun.", style: TextStyle(color: Colors.white)),
             const SizedBox(height: 5),
             const Text("2. Işığın yansımasını engelleyin.", style: TextStyle(color: Colors.white)),
             const SizedBox(height: 5),
             const Text("3. Yazıların okunur netlikte olduğundan emin olun.", style: TextStyle(color: Colors.white)),
           ],
        ),
        actions: [
           TextButton(
             onPressed: () => Navigator.pop(context, false), 
             child: const Text('İPTAL', style: TextStyle(color: Colors.grey))
           ),
           ElevatedButton(
             onPressed: () => Navigator.pop(context, true), 
             style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFE65100)),
             child: const Text('KAMERAYI AÇ', style: TextStyle(color: Colors.white))
           ),
        ],
      )
    ) ?? false;
  }

  // Tarih Seçme
  Future<void> _selectDate(BuildContext context) async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime(2025),
      lastDate: DateTime(2030),
      locale: const Locale('tr', 'TR'),
    );
    if (picked != null && picked != _selectedDate) {
      setState(() {
        _selectedDate = picked;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = Provider.of<AuthService>(context).user;
    final userName = user?['name'] ?? 'Personel';
    final userCode = user?['code'] ?? '00';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Günlük Rapor Oluştur'),
        actions: [
          IconButton(
            icon: const Icon(Icons.share),
            onPressed: () => _generateAndSharePDF(userName, userCode),
            tooltip: 'PDF Oluştur ve Paylaş',
          )
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 1. Üst Bilgi (Personel & Tarih)
              _buildCard(
                title: 'Genel Bilgiler',
                child: Column(
                  children: [
                    ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: const Icon(Icons.person, color: Colors.orange),
                      title: Text('$userName ($userCode)', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                      subtitle: const Text('Personel', style: TextStyle(color: Colors.white54)),
                    ),
                    InkWell(
                      onTap: () => _selectDate(context),
                      child: InputDecorator(
                        decoration: const InputDecoration(
                          labelText: 'Rapor Tarihi',
                          prefixIcon: Icon(Icons.calendar_today, color: Colors.orange),
                        ),
                        child: Text(
                          DateFormat('dd.MM.yyyy').format(_selectedDate),
                          style: const TextStyle(color: Colors.white),
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 15),

              // 2. Araç Bilgileri
              _buildCard(
                title: 'Araç Bilgileri',
                child: Column(
                  children: [
                    _buildTextField(_plateController, 'Araç Plakası', icon: Icons.directions_car),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Expanded(child: _buildTextField(_startKmController, 'Başlangıç KM', icon: Icons.speed, isNumber: true)),
                        const SizedBox(width: 10),
                        Expanded(child: _buildTextField(_endKmController, 'Gün Sonu KM', icon: Icons.speed, isNumber: true)),
                      ],
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 15),

              // 3. Giderler (Resimli)
              _buildCard(
                title: 'Giderler',
                child: Column(
                  children: [
                    Row(
                      children: [
                        Expanded(child: _buildTextField(_fuelCostController, 'Yakıt Tutarı (TL)', icon: Icons.local_gas_station, isNumber: true)),
                        IconButton(
                          icon: Icon(_fuelImage == null ? Icons.camera_alt : Icons.check_circle, 
                            color: _fuelImage == null ? Colors.white54 : Colors.green),
                          onPressed: () => _pickImage(true),
                          tooltip: 'Fiş Çek',
                        ),
                      ],
                    ),
                    if (_fuelImage != null) 
                      Padding(padding: const EdgeInsets.only(bottom: 10), child: Text('Yakıt Fişi Eklendi', style: TextStyle(color: Colors.green[300], fontSize: 12))),
                    
                    const SizedBox(height: 10),
                    _buildTextField(_repairDescController, 'Tamir/Bakım Açıklama', icon: Icons.build),
                    const SizedBox(height: 5),
                    Row(
                      children: [
                        Expanded(child: _buildTextField(_repairCostController, 'Tamir Tutarı (TL)', icon: Icons.attach_money, isNumber: true)),
                         IconButton(
                          icon: Icon(_repairImage == null ? Icons.camera_alt : Icons.check_circle, 
                            color: _repairImage == null ? Colors.white54 : Colors.green),
                          onPressed: () => _pickImage(false),
                          tooltip: 'Fiş Çek',
                        ),
                      ],
                    ),
                     if (_repairImage != null) 
                      Padding(padding: const EdgeInsets.only(bottom: 10), child: Text('Tamir Fişi Eklendi', style: TextStyle(color: Colors.green[300], fontSize: 12))),
                      
                     const SizedBox(height: 10),
                     _buildTextField(_otherDescController, 'Diğer Araç Giderleri', icon: Icons.notes),
                  ],
                ),
              ),

              const SizedBox(height: 15),

              // 4. Tahsilatlar
              _buildCard(
                title: 'Tahsilatlar',
                child: Column(
                  children: [
                    _buildTextField(_cashController, 'Nakit Tahsilat (TL)', icon: Icons.money, isNumber: true, onChanged: (_) => setState((){})),
                    const SizedBox(height: 10),
                    _buildTextField(_ccController, 'Kredi Kartı', icon: Icons.credit_card, isNumber: true, onChanged: (_) => setState((){})),
                    const SizedBox(height: 10),
                    _buildTextField(_checkController, 'Çek', icon: Icons.sticky_note_2, isNumber: true, onChanged: (_) => setState((){})),
                    const SizedBox(height: 10),
                    _buildTextField(_eftController, 'EFT / Havale', icon: Icons.account_balance, isNumber: true, onChanged: (_) => setState((){})),
                    
                    const Divider(color: Colors.white24, height: 30),
                    
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('TOPLAM:', style: TextStyle(color: Colors.white70, fontWeight: FontWeight.bold)),
                        Text('₺ ${totalCollection.toStringAsFixed(2)}', style: const TextStyle(color: Colors.orange, fontSize: 18, fontWeight: FontWeight.bold)),
                      ],
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 15),

              // 5. Kasa Teslim (Fark Hesabı)
              _buildCard(
                title: 'Kasa Teslim',
                child: Column(
                  children: [
                    _buildTextField(_deliveredCashController, 'Teslim Edilen Nakit (TL)', icon: Icons.handshake, isNumber: true, onChanged: (_) => setState((){})),
                    const SizedBox(height: 10),
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: cashDifference == 0 
                            ? Colors.blue.withOpacity(0.2) 
                            : (cashDifference < 0 ? Colors.red.withOpacity(0.2) : Colors.green.withOpacity(0.2)),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('KASA FARKI:', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                          Text(
                            '${cashDifference > 0 ? '+' : ''}${cashDifference.toStringAsFixed(2)} TL',
                            style: TextStyle(
                              color: cashDifference == 0 
                                  ? Colors.blue 
                                  : (cashDifference < 0 ? Colors.redAccent : Colors.greenAccent),
                              fontSize: 18,
                              fontWeight: FontWeight.bold
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 20),
              
              _buildTextField(_notesController, 'Genel Açıklama / Notlar', maxLines: 3),

              const SizedBox(height: 30),

              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton.icon(
                  onPressed: () => _generateAndSharePDF(userName, userCode),
                  icon: const Icon(Icons.picture_as_pdf),
                  label: const Text('KAYDET VE GÖNDER', style: TextStyle(fontSize: 16)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFE65100),
                    foregroundColor: Colors.white,
                  ),
                ),
              ),
              const SizedBox(height: 40),
            ],
          ),
        ),
      ),
    );
  }

  // PDF Oluşturma ve Paylaşma
  Future<void> _generateAndSharePDF(String userName, String userCode) async {
    final pdf = pw.Document();
    
    // font yükleme (Türkçe karakterler için)
    final font = await PdfGoogleFonts.notoSansRegular();
    final fontBold = await PdfGoogleFonts.notoSansBold();

    // Logo yükle
    final logoImage = await imageFromAssetBundle('assets/atilimlogo.png');

    pdf.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.a4,
        build: (pw.Context context) {
          return pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              // Başlık ve Logo
              pw.Header(
                level: 0,
                child: pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                  children: [
                    pw.Image(logoImage, width: 150), // Logo
                    pw.Column(
                      crossAxisAlignment: pw.CrossAxisAlignment.end,
                      children: [
                        pw.Text('ATILIM GIDA', style: pw.TextStyle(font: fontBold, fontSize: 18, color: PdfColors.orange800)),
                        pw.Text('GÜNLÜK SATIŞ RAPORU', style: pw.TextStyle(font: fontBold, fontSize: 14)),
                      ]
                    )
                  ],
                ),
              ),
              
              pw.SizedBox(height: 20),
              
              // Personel Bilgisi
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                   pw.Text('Tarih: ${DateFormat('dd.MM.yyyy').format(_selectedDate)}', style: pw.TextStyle(font: font, fontSize: 12)),
                   pw.Text('Personel: $userName ($userCode)', style: pw.TextStyle(font: fontBold, fontSize: 12)),
                ]
              ),
              
              pw.Divider(),

              // Araç Tablosu
              pw.TableHelper.fromTextArray(
                context: context,
                headers: ['Plaka', 'Başlangıç KM', 'Gün Sonu KM', 'Toplam Yol'],
                data: [
                  [
                    _plateController.text,
                    _startKmController.text,
                    _endKmController.text,
                    '${(double.tryParse(_endKmController.text) ?? 0) - (double.tryParse(_startKmController.text) ?? 0)} km'
                  ]
                ],
                headerStyle: pw.TextStyle(font: fontBold, color: PdfColors.white),
                headerDecoration: const pw.BoxDecoration(color: PdfColors.orange800),
                cellStyle: pw.TextStyle(font: font),
              ),

              pw.SizedBox(height: 20),

              // Tahsilat Tablosu
              pw.Text('TAHSİLAT DÖKÜMÜ', style: pw.TextStyle(font: fontBold, fontSize: 14)),
              pw.SizedBox(height: 5),
              pw.TableHelper.fromTextArray(
                headers: ['Tür', 'Tutar'],
                data: [
                  ['Nakit', '${_cashController.text} TL'],
                  ['Kredi Kartı', '${_ccController.text} TL'],
                  ['Çek', '${_checkController.text} TL'],
                  ['EFT/Havale', '${_eftController.text} TL'],
                  ['TOPLAM', '${totalCollection.toStringAsFixed(2)} TL'],
                ],
                headerStyle: pw.TextStyle(font: fontBold, color: PdfColors.white),
                headerDecoration: const pw.BoxDecoration(color: PdfColors.grey700),
                cellStyle: pw.TextStyle(font: font),
                cellAlignments: {0: pw.Alignment.centerLeft, 1: pw.Alignment.centerRight},
              ),

              pw.SizedBox(height: 20),

              // Kasa Farkı
              pw.Container(
                padding: const pw.EdgeInsets.all(10),
                decoration: pw.BoxDecoration(
                  border: pw.Border.all(color: PdfColors.grey),
                ),
                child: pw.Column(
                  children: [
                    pw.Row(mainAxisAlignment: pw.MainAxisAlignment.spaceBetween, children: [
                      pw.Text('Teslim Edilen Nakit:', style: pw.TextStyle(font: font)),
                      pw.Text('${_deliveredCashController.text} TL', style: pw.TextStyle(font: fontBold)),
                    ]),
                    pw.Divider(),
                    pw.Row(mainAxisAlignment: pw.MainAxisAlignment.spaceBetween, children: [
                      pw.Text('KASA FARKI (+ Fazla / - Eksik):', style: pw.TextStyle(font: fontBold)),
                      pw.Text('${cashDifference > 0 ? '+' : ''}${cashDifference.toStringAsFixed(2)} TL', 
                        style: pw.TextStyle(font: fontBold, color: cashDifference < 0 ? PdfColors.red : PdfColors.green)),
                    ]),
                  ]
                )
              ),
              
              pw.SizedBox(height: 20),
              
              // Giderler
              if (_fuelCostController.text.isNotEmpty || _repairCostController.text.isNotEmpty)
              pw.Column(
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                    pw.Text('GİDERLER', style: pw.TextStyle(font: fontBold, fontSize: 14)),
                    pw.SizedBox(height: 5),
                    pw.Bullet(text: 'Yakıt: ${_fuelCostController.text} TL', style: pw.TextStyle(font: font)),
                    if (_repairCostController.text.isNotEmpty)
                      pw.Bullet(text: 'Tamir (${_repairDescController.text}): ${_repairCostController.text} TL', style: pw.TextStyle(font: font)),
                ]
              ),

               pw.SizedBox(height: 20),
               pw.Text('Notlar: ${_notesController.text}', style: pw.TextStyle(font: font)),
               
               pw.SizedBox(height: 40),
               pw.Text('İmza', style: pw.TextStyle(font: font)),
            ],
          );
        },
      ),
    );
    
    // Görselleri Yeni Sayfaya Ekle
    if (_fuelImage != null || _repairImage != null) {
      pdf.addPage(pw.Page(
        build: (pw.Context context) {
          return pw.Column(
            children: [
              pw.Text('EKLER (Fişler)', style: pw.TextStyle(font: fontBold, fontSize: 18)),
              pw.SizedBox(height: 20),
              if (_fuelImage != null)
                pw.Expanded(child: pw.Column(children: [
                   pw.Text('Yakıt Fişi'),
                   pw.SizedBox(height: 5),
                   pw.Image(pw.MemoryImage(File(_fuelImage!.path).readAsBytesSync()), fit: pw.BoxFit.contain, height: 300),
                ])),
               if (_repairImage != null)
                pw.Expanded(child: pw.Column(children: [
                   pw.SizedBox(height: 20),
                   pw.Text('Tamir Fişi'),
                   pw.SizedBox(height: 5),
                   pw.Image(pw.MemoryImage(File(_repairImage!.path).readAsBytesSync()), fit: pw.BoxFit.contain, height: 300),
                ])),
            ]
          );
        }
      ));
    }

    // PDF Paylaş
    final pdfBytes = await pdf.save();
    
    // Sunucuya Gönder
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Rapor sunucuya yükleniyor...')));
      
      String? fuelBase64;
      if (_fuelImage != null) {
        final bytes = await File(_fuelImage!.path).readAsBytes();
        fuelBase64 = base64Encode(bytes);
      }
      
      String? repairBase64;
      if (_repairImage != null) {
        final bytes = await File(_repairImage!.path).readAsBytes();
        repairBase64 = base64Encode(bytes);
      }

      final reportData = {
        'date': DateFormat('yyyy-MM-dd').format(_selectedDate),
        'vehiclePlate': _plateController.text,
        'startKm': int.tryParse(_startKmController.text) ?? 0,
        'endKm': int.tryParse(_endKmController.text) ?? 0,
        'expenses': {
          'fuel': {'amount': double.tryParse(_fuelCostController.text) ?? 0, 'image': fuelBase64},
          'maintenance': {
            'desc': _repairDescController.text,
            'amount': double.tryParse(_repairCostController.text) ?? 0,
            'image': repairBase64
          },
          'other': {'desc': _otherDescController.text}
        },
        'collections': {
          'cash': valCash,
          'creditCard': valCC,
          'check': valCheck,
          'eft': valEft
        },
        'cashDelivered': valDelivered,
        'description': _notesController.text,
        'pdfBase64': base64Encode(pdfBytes)
      };

      final success = await Provider.of<AuthService>(context, listen: false).submitReport(reportData);
      
      if (mounted) {
        if (success) {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Rapor sunucuya başarıyla kaydedildi!'), backgroundColor: Colors.green));
          Navigator.pop(context, true);
        } else {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Sunucu kaydı başarısız oldu (Offline Mod)'), backgroundColor: Colors.orange));
        }
      }
    }

    await Printing.sharePdf(bytes: pdfBytes, filename: 'Rapor_${DateFormat('yyyy-MM-dd').format(_selectedDate)}_$userCode.pdf');
  }

  // Yardımcı Widgetlar
  Widget _buildCard({required String title, required Widget child}) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF1E1E1E),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white10),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.orange)),
          const Divider(color: Colors.white10),
          const SizedBox(height: 10),
          child,
        ],
      ),
    );
  }

  Widget _buildTextField(TextEditingController controller, String label, {IconData? icon, bool isNumber = false, int maxLines = 1, Function(String)? onChanged}) {
    return TextFormField(
      controller: controller,
      keyboardType: isNumber ? const TextInputType.numberWithOptions(decimal: true) : TextInputType.text,
      maxLines: maxLines,
      onChanged: onChanged,
      style: const TextStyle(color: Colors.white),
      decoration: InputDecoration(
        labelText: label,
        prefixIcon: icon != null ? Icon(icon, color: Colors.white54) : null,
        labelStyle: const TextStyle(color: Colors.white54),
        filled: true,
        fillColor: Colors.white.withOpacity(0.05),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide.none),
      ),
    );
  }
}
