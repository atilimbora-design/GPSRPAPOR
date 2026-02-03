const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

// Disk storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let uploadPath = 'uploads/';

        if (file.fieldname === 'profile_photo') {
            uploadPath += 'profiles/';
        } else if (file.fieldname === 'fuel_receipt' || file.fieldname === 'maintenance_receipt') {
            uploadPath += 'receipts/';
        } else if (file.fieldname === 'file' && req.body.message_type === 'image') {
            uploadPath += 'messages/';
        } else if (file.fieldname === 'photo' && req.path.includes('groups')) {
            uploadPath += 'groups/';
        }

        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = crypto.randomBytes(16).toString('hex');
        const ext = path.extname(file.originalname);
        cb(null, `${uniqueSuffix}${ext}`);
    }
});

// File filter (Optional but recommended)
const fileFilter = (req, file, cb) => {
    // Basic filter for images
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Sadece resim dosyaları yüklenebilir!'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

module.exports = upload;
