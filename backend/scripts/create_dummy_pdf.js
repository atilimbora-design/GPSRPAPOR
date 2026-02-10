const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '../uploads/reports');
if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
}

const filePath = path.join(dir, 'dummy_dincer.pdf');
const doc = new PDFDocument();

doc.pipe(fs.createWriteStream(filePath));

doc.fontSize(20).text('ATILIM GIDA - ÖRNEK RAPOR', { align: 'center' });
doc.moveDown();
doc.fontSize(14).text('Personel: Dinçer Öztürk');
doc.text('Tarih: ' + new Date().toISOString().split('T')[0]);
doc.moveDown();
doc.fontSize(12).text('Bu, sistem testi için otomatik oluşturulmuş örnek bir rapordur. Veriler veritabanına işlenmiştir.');
doc.moveDown();
doc.text('Toplam Tahsilat: 19.900 TL');
doc.text('Kasa Farkı: Yok');

doc.end();

console.log('Dummy PDF created at:', filePath);
