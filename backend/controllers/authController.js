const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const db = require('../config/database');
const Joi = require('joi');

const loginSchema = Joi.object({
    username: Joi.string().required(),
    password: Joi.string().required(),
    remember: Joi.boolean().default(false),
    platform: Joi.string().valid('web', 'mobile').required()
});

function generateToken(user, remember = false) {
    const expiresIn = remember ? process.env.JWT_REFRESH_EXPIRES_IN : process.env.JWT_EXPIRES_IN;
    return jwt.sign(
        {
            id: user.id,
            username: user.username,
            role: user.role,
            full_name: user.full_name,
            profile_photo: user.profile_photo
        },
        process.env.JWT_SECRET,
        { expiresIn }
    );
}

function generateRefreshToken(user) {
    return jwt.sign(
        { id: user.id },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN }
    );
}

exports.login = async (req, res) => {
    // Validate request
    const { error } = loginSchema.validate(req.body);
    if (error) {
        return res.status(400).json({
            success: false,
            error: error.details[0].message
        });
    }

    const { username, password, remember, platform } = req.body;

    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
        if (err) {
            return res.status(500).json({ success: false, error: 'Database error' });
        }
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Kullanıcı adı veya şifre hatalı'
            });
        }

        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) {
            return res.status(401).json({
                success: false,
                error: 'Kullanıcı adı veya şifre hatalı'
            });
        }

        // Platform ve Rol Kontrolü
        if (platform === 'web' && user.role === 'personel') {
            return res.status(403).json({
                success: false,
                error: 'Personel hesapları sadece mobil uygulamadan kullanılabilir',
                error_code: 'PLATFORM_MISMATCH'
            });
        }

        if (platform === 'mobile' && user.role === 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Admin hesapları sadece web arayüzünden kullanılabilir',
                error_code: 'PLATFORM_MISMATCH'
            });
        }

        // Update last login
        db.run('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

        const token = generateToken(user, remember);
        const refreshToken = generateRefreshToken(user);

        // Save refresh token to db for stricter security (optional, but good practice)
        // For now we just return it as per prompt requirements

        res.json({
            success: true,
            token,
            refreshToken,
            user: {
                id: user.id,
                username: user.username,
                full_name: user.full_name,
                role: user.role,
                profile_photo: user.profile_photo
            }
        });
    });
};

exports.refreshToken = (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
        return res.status(401).json({ success: false, error: 'Refresh token required' });
    }

    jwt.verify(refreshToken, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ success: false, error: 'Invalid refresh token' });
        }

        // Fetch fresh user data to ensure role hasn't changed/user hasn't been deleted
        db.get('SELECT * FROM users WHERE id = ?', [user.id], (dbErr, dbUser) => {
            if (dbErr || !dbUser) {
                return res.status(403).json({ success: false, error: 'User not found' });
            }

            const newToken = generateToken(dbUser);
            res.json({
                success: true,
                token: newToken
            });
        });
    });
};

exports.logout = (req, res) => {
    // Client side should just delete the token. 
    // If we were storing tokens in DB we would delete here.
    res.json({ success: true, message: 'Başarıyla çıkış yapıldı' });
};
