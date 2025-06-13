const express = require('express');
const router = express.Router();
const path = require('path');
const User = require('../models/User');
const Role = require('../models/Role');
const bcrypt = require('bcrypt');
const multer = require('multer');
const fs = require('fs');

// Настройка multer для загрузки файлов
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../public/uploads/avatars');
        // Создаем директорию, если она не существует
        fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `avatar-${req.session.user.id}-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error('Только изображения формата JPEG или PNG!'));
    },
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

const checkAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 2) {
        next();
    } else {
        return res.render('error', { errorCode: 403, errorMessage: 'Доступ запрещен' });
    }
};

router.get('/profile', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/auth/login');
    }
    if (req.session.user.role === 2) {
        return res.redirect('/admin');
    }
    res.sendFile(path.join(__dirname, '../public/html/profile.html'));
});

router.get('/login', (req, res) => {
    if (req.session.user) {
        return res.redirect('/auth/profile')
    }
    res.sendFile(path.join(__dirname, '../public/html/auth.html'));
});

router.get('/reg', (req, res) => {
    if (req.session.user) {
        return res.redirect('/auth/profile')
    }
    res.sendFile(path.join(__dirname, '../public/html/reg.html'));
});

router.get('/user/:id', checkAdmin, async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (!user) {
            return res.render('error', { errorCode: 404, errorMessage: 'Пользователь не найден' });
        }
        res.json(user);
    } catch (error) {
        return res.render('error', { errorCode: 500, errorMessage: 'Ошибка сервера' });
    }
});

router.get('/user-data', async (req, res) => {
    if (!req.session.user) {
        return res.render('error', { errorCode: 401, errorMessage: 'Необходимо авторизоваться' });
    }
    try {
        const user = await User.findByPk(req.session.user.id);
        if (!user) {
            return res.render('error', { errorCode: 404, errorMessage: 'Пользователь не найден' });
        }
        res.json({
            username: user.Username,
            email: user.Email,
            phoneNumber: user.PhoneNumber,
            dateOfBirth: user.DateOfBirth ? user.DateOfBirth.toISOString().split('T')[0] : null,
            avatar: user.Avatar || '/image/default-avatar.png'
        });
    } catch (error) {
        console.error('Ошибка при получении данных пользователя:', error);
        return res.render('error', { errorCode: 500, errorMessage: 'Ошибка сервера' });
    }
});

router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Ошибка при уничтожении сессии:', err);
            return res.render('error', { errorCode: 500, errorMessage: 'Ошибка при выходе' });
        }
        res.redirect('/auth/login');
    });
});

router.post('/reg', async (req, res) => {
    const { username, email, password } = req.body;
    try {
        const existingEmail = await User.findOne({ where: { Email: email } });
        if (existingEmail) {
            return res.render('error', { errorCode: 409, errorMessage: 'Пользователь с такой почтой уже зарегистрирован' });
        }
        const existingUser = await User.findOne({ where: { Username: username } });
        if (existingUser) {
            return res.render('error', { errorCode: 409, errorMessage: 'Пользователь с таким логином уже зарегистрирован' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await User.create({
            Username: username,
            Password: hashedPassword,
            Email: email,
            RoleID: 1
        });
        req.session.user = { id: newUser.UserID, role: newUser.RoleID, username: newUser.Username };
        req.session.save((error) => {
            if (error) {
                console.log('Ошибка при сохранении сессии:', error);
                return res.render('error', { errorCode: 500, errorMessage: 'Ошибка при сохранении сессии' });
            }
            res.redirect('/auth/profile');
        });
    } catch (error) {
        console.log('Ошибка при регистрации: ', error);
        return res.render('error', { errorCode: 500, errorMessage: 'Ошибка при регистрации' });
    }
});

router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ where: { Username: username }, include: { model: Role, as: 'Role' } });
        if (!user) {
            return res.render('error', { errorCode: 400, errorMessage: 'Неверные данные' });
        }
        if (user.status === 'blocked') {
            return res.render('error', { errorCode: 403, errorMessage: 'Ваш аккаунт заблокирован' });
        }
        const validPassword = await bcrypt.compare(password, user.Password);
        if (!validPassword) {
            return res.render('error', { errorCode: 400, errorMessage: 'Неверные данные' });
        }
        req.session.user = { id: user.UserID, role: user.RoleID, username: user.Username };
        req.session.save((error) => {
            if (error) {
                console.log('Ошибка при сохранении сессии:', error);
                return res.render('error', { errorCode: 500, errorMessage: 'Ошибка при сохранении сессии' });
            }
            if (user.RoleID === 2) {
                res.redirect('/admin');
            } else {
                res.redirect('/auth/profile');
            }
        });
    } catch (error) {
        console.error('Ошибка при логине:', error);
        return res.render('error', { errorCode: 500, errorMessage: 'Ошибка сервера при входе' });
    }
});

router.post('/update-profile', async (req, res) => {
    if (!req.session.user) {
        return res.render('error', { errorCode: 401, errorMessage: 'Необходимо авторизоваться' });
    }
    const { username, phoneNumber, dateOfBirth } = req.body;
    try {
        const user = await User.findByPk(req.session.user.id);
        if (!user) {
            return res.render('error', { errorCode: 404, errorMessage: 'Пользователь не найден' });
        }
        user.Username = username;
        user.PhoneNumber = phoneNumber;
        user.DateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
        await user.save();
        res.status(200).send('Профиль обновлен');
    } catch (error) {
        console.error('Ошибка при обновлении профиля:', error);
        return res.render('error', { errorCode: 500, errorMessage: 'Ошибка при обновлении профиля' });
    }
});


router.post('/upload-avatar', upload.single('avatar'), async (req, res) => {
    if (!req.session.user) {
        return res.render('error', { errorCode: 401, errorMessage: 'Необходимо авторизоваться' });
    }
    try {
        const user = await User.findByPk(req.session.user.id);
        if (!user) {
            return res.render('error', { errorCode: 404, errorMessage: 'Пользователь не найден' });
        }

        if (user.Avatar && fs.existsSync(path.join(__dirname, '../public', user.Avatar))) {
            fs.unlinkSync(path.join(__dirname, '../public', user.Avatar));
        }

        user.Avatar = `/uploads/avatars/${req.file.filename}`;
        await user.save();
        res.json({ avatar: user.Avatar });
    } catch (error) {
        console.error('Ошибка при загрузке аватара:', error);
        return res.render('error', { errorCode: 500, errorMessage: 'Ошибка при загрузке аватара' });
    }
});

module.exports = router;