const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const DB_PATH = process.env.DB_PATH || './database/atilim.db';
const db = new sqlite3.Database(DB_PATH);

const today = new Date().toISOString().split('T')[0];

async function run() {
    // 1. Get User
    const user = await new Promise((resolve, reject) => {
        db.get("SELECT * FROM users WHERE full_name LIKE '%Dinçer%'", (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });

    if (!user) {
        console.error("User Dinçer not found!");
        process.exit(1);
    }

    // 2. Define Data
    const reportData = {
        report_date: today,
        vehicle_plate: '34FF677', // From Image
        start_km: 24580,
        end_km: 25386,
        fuel_expense: 2200.00,
        maintenance_expense: 0,
        toll_expense: 0,
        cash_amount: 4528.00, // From Image
        credit_card_amount: 5000.00,
        check_amount: 5000.00,
        eft_amount: 0.00,
        accounting_delivered: 4528.00,
        cash_difference_reason: null,
        maintenance_description: null
    };

    // 3. Generate PDF (Match Controller Logic)
    // Format: Rapor_YYYY-MM-DD_UserID.pdf
    const paddedId = user.id.toString().padStart(2, '0');
    const fileName = `Rapor_${today}_${paddedId}.pdf`;

    const uploadDir = path.join(__dirname, '../uploads/reports');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, fileName);
    const relativePath = `uploads/reports/${fileName}`;

    const stream = fs.createWriteStream(filePath);
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    doc.pipe(stream);

    // Register Fonts
    doc.registerFont('Regular', 'C:/Windows/Fonts/arial.ttf');
    doc.registerFont('Bold', 'C:/Windows/Fonts/arialbd.ttf');
    doc.font('Regular');

    // Colors
    const ORANGE = '#EA580C';
    const DARK_GRAY = '#374151';
    const BORDER_COLOR = '#E5E7EB';
    const RED = '#DC2626';
    const GREEN = '#16A34A';

    // --- Header ---
    const logoPath = path.join(__dirname, '../assets/logo.png');
    if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 40, 40, { width: 120 });
    }

    doc.fontSize(20).fillColor(ORANGE).font('Bold')
        .text('ATILIM GIDA', 200, 45, { align: 'right' });
    doc.fontSize(14).fillColor('black')
        .text('GÜNLÜK SATIŞ RAPORU', 200, 70, { align: 'right' });

    doc.moveDown(4);

    // --- Info Line ---
    let y = 130;
    doc.fontSize(11).font('Regular').fillColor('black');
    doc.text(`Tarih: ${reportData.report_date.split('-').reverse().join('.')}`, 40, y);
    doc.font('Bold').text(`Personel: ${user.full_name} (${paddedId})`, 300, y, { align: 'right' });

    // --- KM Table ---
    y += 25;
    const tableWidth = 515;
    const colWidths = [100, 138, 138, 139];
    const headers = ['Plaka', 'Başlangıç KM', 'Gün Sonu KM', 'Toplam Yol'];

    doc.rect(40, y, tableWidth, 25).fill(ORANGE);
    doc.fillColor('white').font('Bold').fontSize(10);

    let x = 40;
    headers.forEach((h, i) => {
        doc.text(h, x + 10, y + 8, { width: colWidths[i] - 20, align: 'center' });
        x += colWidths[i];
    });

    y += 25;
    doc.rect(40, y, tableWidth, 25).stroke(BORDER_COLOR);
    doc.fillColor('black').font('Regular');

    const rowData = [
        reportData.vehicle_plate,
        reportData.start_km,
        reportData.end_km,
        `${reportData.end_km - reportData.start_km} km`
    ];

    x = 40;
    rowData.forEach((d, i) => {
        doc.moveTo(x, y).lineTo(x, y + 25).strokeColor(BORDER_COLOR).stroke();
        doc.text(d.toString(), x + 10, y + 8, { width: colWidths[i] - 20, align: 'center' });
        x += colWidths[i];
    });
    doc.moveTo(x, y).lineTo(x, y + 25).strokeColor(BORDER_COLOR).stroke();


    // --- Collection Table ---
    y += 40;
    doc.font('Bold').fontSize(11).fillColor('black').text('TAHSİLAT DÖKÜMÜ', 40, y);
    y += 20;

    const c1 = 200;
    const c2 = 315;

    doc.rect(40, y, tableWidth, 25).fill(DARK_GRAY);
    doc.fillColor('white').font('Bold').fontSize(10);
    doc.text('Tür', 50, y + 8);
    doc.text('Tutar', 40 + c1, y + 8, { width: c2 - 20, align: 'right' });

    y += 25;
    const collections = [
        { label: 'Nakit', value: reportData.cash_amount },
        { label: 'Kredi Kartı', value: reportData.credit_card_amount },
        { label: 'Çek', value: reportData.check_amount },
        { label: 'EFT/Havale', value: reportData.eft_amount }
    ];

    doc.font('Regular').fontSize(10).fillColor('black');

    collections.forEach((item) => {
        doc.rect(40, y, tableWidth, 25).strokeColor(BORDER_COLOR).stroke();
        doc.text(item.label, 50, y + 8);
        doc.text(item.value ? `${item.value} TL` : '', 40 + c1, y + 8, { width: c2 - 20, align: 'right' });
        y += 25;
    });

    doc.rect(40, y, tableWidth, 25).strokeColor('black').stroke();
    doc.font('Bold');
    doc.text('TOPLAM', 50, y + 8);
    const totalColl = reportData.cash_amount + reportData.credit_card_amount + reportData.check_amount + reportData.eft_amount;
    doc.text(`${totalColl.toFixed(2)} TL`, 40 + c1, y + 8, { width: c2 - 20, align: 'right' });


    // --- Summary Box ---
    y += 40;
    doc.rect(40, y, tableWidth, 60).strokeColor('#9CA3AF').stroke(); // Darker border

    y += 15;
    doc.font('Regular');
    doc.text('Teslim Edilen Nakit:', 50, y);
    doc.font('Bold').text(`${reportData.accounting_delivered} TL`, 40 + c1, y, { width: c2 - 20, align: 'right' });

    y += 15;
    doc.moveTo(40, y + 5).lineTo(40 + tableWidth, y + 5).strokeColor(BORDER_COLOR).stroke();

    y += 15;
    const diff = reportData.cash_amount - reportData.accounting_delivered;
    doc.font('Bold').fillColor('black').text('KASA FARKI (+ Fazla / - Eksik):', 50, y);

    if (Math.abs(diff) < 1) {
        doc.fillColor(GREEN).text('0.00 TL', 40 + c1, y, { width: c2 - 20, align: 'right' });
    } else {
        const sign = diff > 0 ? '+' : '';
        doc.fillColor(RED).text(`${sign}${diff.toFixed(2)} TL`, 40 + c1, y, { width: c2 - 20, align: 'right' });
    }


    // --- Expenses ---
    y += 40;
    doc.fillColor('black').font('Bold').fontSize(11).text('GİDERLER', 40, y);
    y += 20;
    doc.font('Regular').fontSize(10);

    doc.circle(50, y + 5, 2).fill('black');
    doc.text(`Yakıt: ${reportData.fuel_expense} TL`, 60, y);

    // Footer
    y += 45;
    doc.font('Regular').text('Notlar:', 40, y);
    y += 60;
    doc.text('İmza', 40, y);

    doc.end();

    await new Promise(r => stream.on('finish', r));
    console.log("PDF Created:", filePath);

    // 4. Update DB
    db.run(`UPDATE reports SET 
        vehicle_plate=?, start_km=?, end_km=?, fuel_expense=?, 
        cash_amount=?, credit_card_amount=?, check_amount=?, eft_amount=?,
        accounting_delivered=?, pdf_path=?
        WHERE user_id=? AND report_date=?`,
        [
            reportData.vehicle_plate, reportData.start_km, reportData.end_km, reportData.fuel_expense,
            reportData.cash_amount, reportData.credit_card_amount, reportData.check_amount, reportData.eft_amount,
            reportData.accounting_delivered, relativePath,
            user.id, today
        ],
        (err) => {
            if (err) console.error(err);
            else console.log("DB Updated");
            db.close();
        }
    );
}

run();
