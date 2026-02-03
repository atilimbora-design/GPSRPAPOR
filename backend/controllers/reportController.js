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
}).unknown(true); // Allow unknown because of file fields handling

// Helper: Compress Image
async function compressImage(filePath) {
    try {
        const tempPath = filePath + '.tmp';
        await sharp(filePath)
            .resize(1200, 1600, { fit: 'inside', withoutEnlargement: true }) // Reasonable limit for PDF
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
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const fileName = `${user.username}_${report.report_date}_${Date.now()}.pdf`;
    const filePath = path.join('uploads', 'reports', fileName);
    const fullPath = path.join(__dirname, '..', filePath);

    // Ensure dir exists (already handled in server.js but safe to check if separate worker)

    const stream = fs.createWriteStream(fullPath);
    doc.pipe(stream);

    // Header
    doc.fontSize(20).text('ATILIM GIDA', { align: 'center' });
    doc.fontSize(14).text('GÜNLÜK SATIŞ VE GİDER RAPORU', { align: 'center' });
    doc.moveDown();

    // Info Section
    doc.fontSize(12);
    doc.text(`Tarih: ${report.report_date}       Personel: ${user.full_name} (${user.username})`);
    doc.text(`Plaka: ${report.vehicle_plate}`);
    doc.moveDown();

    // KM Info
    doc.text('------------------------------------------------------------');
    doc.text(`Başlangıç KM: ${report.start_km}`);
    doc.text(`Bitiş KM:     ${report.end_km}`);
    doc.text(`Toplam Yol:   ${report.end_km - report.start_km} km`);
    doc.moveDown();

    // Collections
    doc.text('------------------------------------------------------------');
    doc.text('TAHSİLATLAR', { underline: true });
    doc.text(`Nakit:        ${report.cash_amount} TL`);
    doc.text(`Kredi Kartı:  ${report.credit_card_amount} TL`);
    doc.text(`Çek:          ${report.check_amount} TL`);
    doc.text(`EFT/Havale:   ${report.eft_amount} TL`);
    const totalCollection = parseFloat(report.cash_amount) + parseFloat(report.credit_card_amount)
        + parseFloat(report.check_amount) + parseFloat(report.eft_amount);
    doc.font('Helvetica-Bold').text(`TOPLAM:       ${totalCollection} TL`);
    doc.font('Helvetica');
    doc.moveDown();

    // Accounting
    doc.text('Muhasebeye Teslim (Nakit): ' + report.accounting_delivered + ' TL');
    const diff = parseFloat(report.cash_amount) - parseFloat(report.accounting_delivered);
    if (diff !== 0) {
        doc.fillColor('red').text(`KASA FARKI:   ${diff} TL`);
        if (report.cash_difference_reason) {
            doc.text(`Açıklama:     ${report.cash_difference_reason}`);
        }
        doc.fillColor('black');
    }
    doc.moveDown();

    // Expenses
    doc.text('------------------------------------------------------------');
    doc.text('GİDERLER', { underline: true });
    if (report.fuel_expense > 0) doc.text(`Yakıt:        ${report.fuel_expense} TL`);
    if (report.maintenance_expense > 0) {
        doc.text(`Bakım/Tamir:  ${report.maintenance_expense} TL`);
        if (report.maintenance_description) doc.text(`   (${report.maintenance_description})`);
    }
    if (report.toll_expense > 0) doc.text(`HGS/OGS:      ${report.toll_expense} TL`);

    // Images
    if (files.fuel_receipt || files.maintenance_receipt) {
        doc.addPage();
        doc.text('FİŞ GÖRSELLERİ', { align: 'center', underline: true });
        doc.moveDown();

        // Helper to add image safely
        const addImage = (file) => {
            try {
                doc.image(file.path, { width: 400 });
                doc.moveDown();
            } catch (e) {
                doc.text(`[Görsel Yüklenemedi: ${file.originalname}]`);
            }
        };

        if (files.fuel_receipt) {
            doc.text('Yakıt Fişi:');
            files.fuel_receipt.forEach(addImage);
        }

        if (files.maintenance_receipt) {
            doc.text('Bakım Fişi:');
            files.maintenance_receipt.forEach(addImage);
        }
    }

    doc.end();

    return new Promise((resolve, reject) => {
        stream.on('finish', () => resolve(filePath.replace(/\\/g, '/'))); // Return relative web path
        stream.on('error', reject);
    });
}

exports.createReport = async (req, res) => {
    // Files are in req.files (Multer fields)
    // Body fields need validaton

    // Quick fix for numbers coming as strings from FormData
    const body = { ...req.body };
    const numericFields = ['start_km', 'end_km', 'fuel_expense', 'maintenance_expense', 'toll_expense',
        'credit_card_amount', 'check_amount', 'eft_amount', 'cash_amount', 'accounting_delivered'];

    numericFields.forEach(f => {
        if (body[f]) body[f] = parseFloat(body[f]);
    });

    const { error } = reportSchema.validate(body);
    if (error) {
        // Cleanup uploaded files if validation fails
        if (req.files) {
            Object.values(req.files).flat().forEach(f => fs.unlinkSync(f.path));
        }
        return res.status(400).json({ success: false, error: error.details[0].message });
    }

    const userId = req.user.id;
    const reportDate = body.report_date;

    // Check Duplicate
    db.get('SELECT id FROM reports WHERE user_id = ? AND report_date = ?', [userId, reportDate], async (err, row) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        if (row) {
            // Cleanup files
            if (req.files) Object.values(req.files).flat().forEach(f => fs.unlinkSync(f.path));
            return res.status(400).json({ success: false, error: "Bu tarih için zaten rapor oluşturulmuş" });
        }

        try {
            // Process Files (Compress)
            const files = req.files || {};
            if (files.fuel_receipt) {
                for (let f of files.fuel_receipt) await compressImage(f.path);
            }
            if (files.maintenance_receipt) {
                for (let f of files.maintenance_receipt) await compressImage(f.path);
            }

            // Generate PDF
            const pdfPath = await generatePDF(body, req.user, files);

            // Save to DB
            const stmt = db.prepare(`
                INSERT INTO reports (
                    user_id, report_date, vehicle_plate, start_km, end_km,
                    fuel_expense, fuel_receipt, maintenance_expense, maintenance_receipt, maintenance_description,
                    toll_expense, credit_card_amount, check_amount, eft_amount, cash_amount,
                    accounting_delivered, cash_difference_reason, pdf_path, status, submitted_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'submitted', CURRENT_TIMESTAMP)
            `);

            // For receipts in DB we just store the first one's path or JSON? 
            // DB schema says TEXT. Let's store the first one's URL if exists
            const fuelReceiptPath = files.fuel_receipt ? files.fuel_receipt[0].path.replace(/\\/g, '/') : null;
            const maintReceiptPath = files.maintenance_receipt ? files.maintenance_receipt[0].path.replace(/\\/g, '/') : null;

            stmt.run([
                userId, reportDate, body.vehicle_plate, body.start_km, body.end_km,
                body.fuel_expense, fuelReceiptPath, body.maintenance_expense, maintReceiptPath, body.maintenance_description,
                body.toll_expense, body.credit_card_amount, body.check_amount, body.eft_amount, body.cash_amount,
                body.accounting_delivered, body.cash_difference_reason, pdfPath
            ], function (err) {
                if (err) return res.status(500).json({ success: false, error: err.message });

                res.json({
                    success: true,
                    message: "Rapor oluşturuldu",
                    report: {
                        id: this.lastID,
                        report_date: reportDate,
                        pdf_url: pdfPath, // Frontend prepends BaseURL
                        total_collection: body.credit_card_amount + body.check_amount + body.eft_amount + body.cash_amount
                    }
                });
            });
            stmt.finalize();

        } catch (e) {
            console.error(e);
            res.status(500).json({ success: false, error: 'Rapor oluşturulurken sunucu hatası: ' + e.message });
        }
    });
};

exports.getHistory = (req, res) => {
    const userId = req.user.id;
    const { page = 1, limit = 20, start_date, end_date } = req.query;
    const offset = (page - 1) * limit;

    let sql = `SELECT * FROM reports WHERE user_id = ?`;
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

exports.getPdf = (req, res) => {
    const { reportId } = req.params;
    // Security: Check if user owns report OR is admin
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
