const db = require('../config/database');
const Joi = require('joi');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Validation Schema
const reportSchema = Joi.object({
    report_date: Joi.date().iso().required(),
    vehicle_plate: Joi.string().required(),
    start_km: Joi.number().integer().min(0).required(),
    end_km: Joi.number().integer().min(Joi.ref('start_km')).required(),
    fuel_expense: Joi.number().min(0).default(0),
    maintenance_expense: Joi.number().min(0).default(0),
    maintenance_description: Joi.string().allow('', null),
    toll_expense: Joi.number().min(0).default(0),
    credit_card_amount: Joi.number().min(0).default(0),
    check_amount: Joi.number().min(0).default(0),
    eft_amount: Joi.number().min(0).default(0),
    cash_amount: Joi.number().min(0).default(0),
    accounting_delivered: Joi.number().min(0).default(0),
    cash_difference_reason: Joi.string().allow('', null)
}).unknown(true);

// Helper: Compress Image
async function compressImage(filePath) {
    try {
        const tempPath = filePath + '.tmp';
        await sharp(filePath)
            .resize(1200, 1600, { fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 80 })
            .toFile(tempPath);

        fs.unlinkSync(filePath);
        fs.renameSync(tempPath, filePath);
        return filePath;
    } catch (err) {
        console.error('Image compression error', err);
        return filePath;
    }
}

// Generate PDF
async function generatePDF(report, user, files) {
    const fileName = `Rapor_${report.report_date}_${user.id.toString().padStart(2, '0')}.pdf`;
    const filePath = path.join('uploads', 'reports', fileName);
    const dir = path.join(__dirname, '..', 'uploads', 'reports');

    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const fullPath = path.join(__dirname, '..', filePath);
    const stream = fs.createWriteStream(fullPath);

    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    doc.pipe(stream);

    const regularFont = path.join(__dirname, '../assets/fonts/arial.ttf');
    const boldFont = path.join(__dirname, '../assets/fonts/arialbd.ttf');

    if (fs.existsSync(regularFont)) doc.registerFont('Regular', regularFont);
    else doc.font('Helvetica'); // Fallback

    if (fs.existsSync(boldFont)) doc.registerFont('Bold', boldFont);
    else doc.font('Helvetica-Bold'); // Fallback

    doc.font('Regular');

    const ORANGE = '#EA580C';
    const DARK_GRAY = '#374151';
    const LIGHT_GRAY = '#F3F4F6';
    const BORDER_COLOR = '#E5E7EB';
    const RED = '#DC2626';
    const GREEN = '#16A34A';

    // Helper for formatted money
    const fmt = (n) => parseFloat(n).toFixed(2) + ' TL';

    // --- Header ---
    const logoPath = path.join(__dirname, '../assets/logo.png');
    if (fs.existsSync(logoPath)) {
        try { doc.image(logoPath, 40, 40, { width: 120 }); } catch (e) { }
    }

    doc.fontSize(20).fillColor(ORANGE).font('Bold').text('ATILIM GIDA', 200, 45, { align: 'right' });
    doc.fontSize(14).fillColor('black').text('GÜNLÜK SATIŞ RAPORU', 200, 70, { align: 'right' });

    doc.moveDown(4);

    let y = 130;
    doc.fontSize(11).font('Regular').fillColor('black');
    doc.text(`Tarih: ${report.report_date.split('-').reverse().join('.')}`, 40, y);

    const paddedId = user.id.toString().padStart(2, '0');
    // FIX 1: Display Full Name or Username if full_name is missing
    const displayName = user.full_name || user.username || 'Bilinmiyor';
    doc.font('Bold').text(`Personel: ${displayName} (${paddedId})`, 300, y, { align: 'right' });

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
        report.vehicle_plate,
        report.start_km,
        report.end_km,
        `${report.end_km - report.start_km} km`
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
    const items = [
        { label: 'Nakit', value: report.cash_amount },
        { label: 'Kredi Kartı', value: report.credit_card_amount },
        { label: 'Çek', value: report.check_amount },
        { label: 'EFT/Havale', value: report.eft_amount }
    ];

    doc.font('Regular').fontSize(10).fillColor('black');

    items.forEach((item, i) => {
        if (i % 2 === 0) doc.rect(40, y, tableWidth, 25).fill(LIGHT_GRAY);
        doc.fillColor('black');
        doc.text(item.label, 50, y + 8);
        doc.text(fmt(item.value), 40 + c1, y + 8, { width: c2 - 20, align: 'right' });
        y += 25;
    });

    // Total
    doc.rect(40, y, tableWidth, 30).stroke('black');
    doc.font('Bold').fontSize(11).text('TOPLAM', 50, y + 10);
    const total = report.cash_amount + report.credit_card_amount + report.check_amount + report.eft_amount;
    doc.text(fmt(total), 40 + c1, y + 10, { width: c2 - 20, align: 'right' });

    y += 40;

    // --- Accounting Delivery Section ---
    doc.rect(40, y, tableWidth, 60).stroke(BORDER_COLOR);
    doc.font('Regular').fontSize(10);
    doc.text('Teslim Edilen Nakit:', 50, y + 15);
    doc.font('Bold').text(fmt(report.accounting_delivered), 40 + c1, y + 15, { width: c2 - 20, align: 'right' });

    // Diff Calculation
    // FIX 2: Correct Difference Calculation: Delivered - Collected
    const diff = report.accounting_delivered - report.cash_amount;
    const diffColor = diff >= 0 ? GREEN : RED;
    const diffLabel = diff >= 0 ? "+ Fazla" : "- Eksik";

    doc.moveTo(40, y + 35).lineTo(40 + tableWidth, y + 35).stroke(BORDER_COLOR);
    doc.font('Bold').fillColor('black').text(`KASA FARKI (${diffLabel}):`, 50, y + 43);
    doc.fillColor(diffColor).text(fmt(diff), 40 + c1, y + 43, { width: c2 - 20, align: 'right' });

    if (diff !== 0 && report.cash_difference_reason) {
        y += 65;
        doc.fillColor('black').font('Bold').text('Fark Nedeni:', 40, y);
        doc.font('Regular').text(report.cash_difference_reason, 120, y);
    } else {
        y += 65;
    }

    // --- Expenses ---
    const expenses = [
        { label: 'Yakıt', value: report.fuel_expense },
        { label: 'Bakım', value: report.maintenance_expense },
        { label: 'HGS/OGS', value: report.toll_expense }
    ];
    const totalExp = expenses.reduce((a, b) => a + b.value, 0);

    if (totalExp > 0) {
        y += 20;
        doc.font('Bold').fontSize(11).fillColor('black').text('GİDERLER', 40, y);
        y += 20;

        doc.rect(40, y, tableWidth, 25).fill(DARK_GRAY);
        doc.fillColor('white').font('Bold').fontSize(10);
        doc.text('Gider Türü', 50, y + 8);
        doc.text('Tutar', 40 + c1, y + 8, { width: c2 - 20, align: 'right' });
        y += 25;

        doc.font('Regular').fillColor('black');
        expenses.forEach((e, i) => {
            if (e.value > 0) {
                doc.rect(40, y, tableWidth, 25).stroke(BORDER_COLOR);
                doc.text(e.label, 50, y + 8);
                doc.text(fmt(e.value), 40 + c1, y + 8, { width: c2 - 20, align: 'right' });
                y += 25;
            }
        });
    }

    // --- Images ---
    if (files.fuel_receipt || files.maintenance_receipt) {
        doc.addPage();
        doc.fontSize(14).font('Bold').text('FİŞ / FATURA GÖRSELLERİ', 40, 40);

        let imgY = 80;

        if (files.fuel_receipt) {
            doc.fontSize(12).text('Yakıt Fişi:', 40, imgY);
            try {
                doc.image(files.fuel_receipt[0].path, 40, imgY + 20, { height: 300 });
            } catch (e) { }
            imgY += 340;
        }

        if (files.maintenance_receipt) {
            if (imgY > 500) { doc.addPage(); imgY = 40; }
            doc.fontSize(12).text('Bakım Faturası:', 40, imgY);
            try {
                doc.image(files.maintenance_receipt[0].path, 40, imgY + 20, { height: 300 });
            } catch (e) { }
        }
    }

    doc.end();

    return new Promise((resolve) => {
        stream.on('finish', () => resolve(filePath.replace(/\\/g, '/')));
    });
}

// Create Report
exports.createReport = async (req, res) => {
    try {
        // Parse Body if multipart
        // If coming from React Native FormData, simple fields are strings.
        // We might need to parse them.
        let body = req.body;

        // Convert string numbers to real numbers
        const numFields = ['start_km', 'end_km', 'fuel_expense', 'maintenance_expense', 'toll_expense',
            'credit_card_amount', 'check_amount', 'eft_amount', 'cash_amount', 'accounting_delivered'];

        numFields.forEach(f => {
            if (body[f]) body[f] = parseFloat(body[f]);
        });

        // Validation
        const { error } = reportSchema.validate(body);
        if (error) {
            if (req.files) Object.values(req.files).flat().forEach(f => fs.unlinkSync(f.path));
            return res.status(400).json({ success: false, error: error.details[0].message });
        }

        const userId = req.user.id;
        const reportDate = body.report_date;

        // Check Daily Limit (Max 2 reports per day)
        db.get('SELECT COUNT(*) as count FROM reports WHERE user_id = ? AND report_date = ?', [userId, reportDate], (err, row) => {
            if (err) return res.status(500).json({ success: false, error: err.message });

            if (row && row.count >= 2) {
                if (req.files) Object.values(req.files).flat().forEach(f => fs.unlinkSync(f.path));
                return res.status(400).json({ success: false, error: "Bu tarih için maksimum rapor limitine (2) ulaştınız." });
            }

            // Processing
            (async () => {
                try {
                    const files = req.files || {};
                    if (files.fuel_receipt) {
                        for (let f of files.fuel_receipt) await compressImage(f.path);
                    }
                    if (files.maintenance_receipt) {
                        for (let f of files.maintenance_receipt) await compressImage(f.path);
                    }

                    // FETCH FULL USER NAME BEFORE PDF
                    db.get('SELECT full_name FROM users WHERE id = ?', [userId], async (uErr, userRow) => {
                        if (uErr) console.error("User fetch error", uErr);

                        const pdfUser = {
                            ...req.user,
                            full_name: userRow ? userRow.full_name : req.user.username
                        };

                        const pdfPath = await generatePDF(body, pdfUser, files);

                        const fuelReceiptPath = files.fuel_receipt ? files.fuel_receipt[0].path.replace(/\\/g, '/') : null;
                        const maintReceiptPath = files.maintenance_receipt ? files.maintenance_receipt[0].path.replace(/\\/g, '/') : null;

                        const stmt = db.prepare(`
                            INSERT INTO reports (
                                user_id, report_date, vehicle_plate, start_km, end_km,
                                fuel_expense, fuel_receipt, maintenance_expense, maintenance_receipt, maintenance_description,
                                toll_expense, credit_card_amount, check_amount, eft_amount, cash_amount,
                                accounting_delivered, cash_difference_reason, pdf_path, status, submitted_at
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'submitted', CURRENT_TIMESTAMP)
                        `);

                        stmt.run([
                            userId, reportDate, body.vehicle_plate, body.start_km, body.end_km,
                            body.fuel_expense, fuelReceiptPath, body.maintenance_expense, maintReceiptPath, body.maintenance_description,
                            body.toll_expense, body.credit_card_amount, body.check_amount, body.eft_amount, body.cash_amount,
                            body.accounting_delivered, body.cash_difference_reason, pdfPath
                        ], function (err) {
                            if (err) {
                                console.error(err);
                                return res.status(500).json({ success: false, error: err.message });
                            }
                            res.json({
                                success: true,
                                message: "Rapor oluşturuldu",
                                report: {
                                    id: this.lastID,
                                    report_date: reportDate,
                                    pdf_url: pdfPath
                                }
                            });
                        });
                        stmt.finalize();
                    });

                } catch (e) {
                    console.error(e);
                    res.status(500).json({ success: false, error: 'Rapor oluşturulurken hata: ' + e.message });
                }
            })();
        });

    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, error: 'Sunucu hatası' });
    }
};

exports.getHistory = (req, res) => {
    const userId = req.user.id;
    const { page = 1, limit = 20, start_date, end_date } = req.query;
    const offset = (page - 1) * limit;

    let sql = `SELECT r.*, u.full_name, u.profile_photo FROM reports r JOIN users u ON u.id = r.user_id WHERE r.user_id = ?`;
    const params = [userId];

    if (start_date) { sql += ` AND report_date >= ?`; params.push(start_date); }
    if (end_date) { sql += ` AND report_date <= ?`; params.push(end_date); }

    sql += ` ORDER BY report_date DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ success: false, error: err.message });

        db.get(`SELECT COUNT(*) as count FROM reports WHERE user_id = ?`, [userId], (err, countRow) => {
            res.json({
                success: true,
                reports: rows,
                pagination: {
                    current_page: parseInt(page),
                    total_pages: Math.ceil((countRow ? countRow.count : 0) / limit),
                    total_count: countRow ? countRow.count : 0
                }
            });
        });
    });
};

exports.getAllReports = (req, res) => {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    db.all(`
        SELECT r.*, u.full_name, u.profile_photo
        FROM reports r
        JOIN users u ON u.id = r.user_id
        WHERE r.report_date = ?
        ORDER BY r.submitted_at DESC
    `, [targetDate], (err, rows) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        res.json({ success: true, reports: rows });
    });
};

exports.getPdf = (req, res) => {
    const { reportId } = req.params;
    db.get(`SELECT * FROM reports WHERE id = ?`, [reportId], (err, report) => {
        if (err || !report) return res.status(404).json({ success: false, error: 'Rapor bulunamadı' });

        if (req.user.role !== 'admin' && report.user_id !== req.user.id) {
            return res.status(403).json({ success: false, error: 'Yetkisiz erişim' });
        }

        const fullPath = path.join(__dirname, '..', report.pdf_path);
        if (fs.existsSync(fullPath)) {
            res.contentType("application/pdf");
            res.sendFile(fullPath);
        } else {
            res.status(404).json({ success: false, error: 'PDF dosyası diskte bulunamadı' });
        }
    });
};

// Export Excel (Daily Summary)
exports.exportExcel = async (req, res) => {
    const { date } = req.query;
    if (!date) return res.status(400).json({ success: false, error: 'Tarih seçilmedi' });

    const ExcelJS = require('exceljs');

    try {
        const rows = await new Promise((resolve, reject) => {
            db.all(`
                SELECT r.*, u.full_name
                FROM reports r
                JOIN users u ON u.id = r.user_id
                WHERE r.report_date = ?
                ORDER BY r.submitted_at DESC
            `, [date], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        if (!rows || rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Bu tarihe ait rapor bulunamadı' });
        }

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Günlük Raporlar');

        worksheet.columns = [
            { header: 'Personel', key: 'full_name', width: 20 },
            { header: 'Plaka', key: 'vehicle_plate', width: 15 },
            { header: 'Başlangıç KM', key: 'start_km', width: 15 },
            { header: 'Bitiş KM', key: 'end_km', width: 15 },
            { header: 'Toplam Yol', key: 'total_km', width: 15 },
            { header: 'Nakit', key: 'cash_amount', width: 15 },
            { header: 'K. Kartı', key: 'credit_card_amount', width: 15 },
            { header: 'Çek', key: 'check_amount', width: 15 },
            { header: 'EFT/Havale', key: 'eft_amount', width: 15 },
            { header: 'Teslim Edilen', key: 'accounting_delivered', width: 15 },
            { header: 'Kasa Farkı', key: 'diff', width: 15 },
            { header: 'Yakıt', key: 'fuel_expense', width: 15 },
            { header: 'Bakım', key: 'maintenance_expense', width: 15 },
            { header: 'HGS/OGS', key: 'toll_expense', width: 15 },
            { header: 'Açıklama/Fark Nedeni', key: 'cash_difference_reason', width: 30 },
            { header: 'Toplam Tahsilat', key: 'total_collection', width: 20 },
            { header: 'Tarih', key: 'submitted_at', width: 20 },
        ];

        // Style Header
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFEEEEEE' }
        };

        // Freeze Top Row
        worksheet.views = [
            { state: 'frozen', xSplit: 0, ySplit: 1 }
        ];

        // Add Data with Zebra Striping
        rows.forEach((r, index) => {
            let diff = (r.accounting_delivered || 0) - (r.cash_amount || 0);
            let diffStr = diff.toString();
            if (diff > 0) diffStr = "+" + diff;

            const totalCollection = (r.cash_amount || 0) + (r.credit_card_amount || 0) + (r.check_amount || 0) + (r.eft_amount || 0);

            const row = worksheet.addRow({
                full_name: r.full_name,
                vehicle_plate: r.vehicle_plate,
                start_km: r.start_km,
                end_km: r.end_km,
                total_km: (r.end_km - r.start_km),
                cash_amount: r.cash_amount,
                credit_card_amount: r.credit_card_amount,
                check_amount: r.check_amount,
                eft_amount: r.eft_amount,
                accounting_delivered: r.accounting_delivered,
                diff: diffStr,
                fuel_expense: r.fuel_expense,
                maintenance_expense: r.maintenance_expense,
                toll_expense: r.toll_expense,
                cash_difference_reason: r.cash_difference_reason || r.maintenance_description,
                total_collection: totalCollection,
                submitted_at: r.submitted_at
            });

            // Alternate Row Color (Darker Gray as per screenshot)
            if (index % 2 === 0) {
                row.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFCCCCCC' } // Darker gray to match screenshot
                };
            }
        });

        // Totals Row
        const totalRow = {
            full_name: 'TOPLAM',
            cash_amount: rows.reduce((s, r) => s + (r.cash_amount || 0), 0),
            credit_card_amount: rows.reduce((s, r) => s + (r.credit_card_amount || 0), 0),
            check_amount: rows.reduce((s, r) => s + (r.check_amount || 0), 0),
            eft_amount: rows.reduce((s, r) => s + (r.eft_amount || 0), 0),
            accounting_delivered: rows.reduce((s, r) => s + (r.accounting_delivered || 0), 0),
            fuel_expense: rows.reduce((s, r) => s + (r.fuel_expense || 0), 0),
            maintenance_expense: rows.reduce((s, r) => s + (r.maintenance_expense || 0), 0),
            toll_expense: rows.reduce((s, r) => s + (r.toll_expense || 0), 0),
            total_collection: rows.reduce((s, r) => s + ((r.cash_amount || 0) + (r.credit_card_amount || 0) + (r.check_amount || 0) + (r.eft_amount || 0)), 0)
        };
        const lastRow = worksheet.addRow(totalRow);

        // Style Last Row (Fluorescent Yellow + Thick Border)
        lastRow.font = { bold: true };
        lastRow.eachCell((cell) => {
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFFFF00' } // Bright Yellow
            };
            cell.border = {
                top: { style: 'medium' },
                left: { style: 'medium' },
                bottom: { style: 'medium' },
                right: { style: 'medium' }
            };
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=Gunluk_Rapor_${date}.xlsx`);

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error("Excel Export Error:", error);
        res.status(500).json({ success: false, error: 'Excel oluşturulamadı' });
    }
};

exports.deleteReport = (req, res) => {
    // ... (existing helper) ...
    const { id } = req.params;

    db.get('SELECT * FROM reports WHERE id = ?', [id], (err, report) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        if (!report) return res.status(404).json({ success: false, error: 'Rapor bulunamadı' });

        // Delete Files Helper
        const deleteFile = (filePath) => {
            if (!filePath) return;
            const absolutePath = path.join(__dirname, '..', filePath);
            if (fs.existsSync(absolutePath)) {
                try { fs.unlinkSync(absolutePath); } catch (e) { console.error('File delete error:', e); }
            }
        };

        // Delete PDF
        deleteFile(report.pdf_path);

        // Delete Receipts
        deleteFile(report.fuel_receipt);
        deleteFile(report.maintenance_receipt);

        // Delete from DB
        db.run('DELETE FROM reports WHERE id = ?', [id], (err) => {
            if (err) return res.status(500).json({ success: false, error: err.message });
            res.json({ success: true, message: 'Rapor başarıyla silindi' });
        });
    });
};
