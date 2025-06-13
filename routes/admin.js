const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const User = require('../models/User');
const { Op } = require('sequelize');
const sequelize = require('../config/database');

const checkAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 2) {
        next();
    } else {
        return res.render('error', { errorCode: 403, errorMessage: 'Доступ запрещен' });
    }
};

router.get('/', checkAdmin, async (req, res) => {
    try {
        const products = await Product.findAll({
            include: [{ model: User, as: 'User', attributes: ['Username'] }],
            limit: 10
        });

        const publishedCount = await Product.count({ where: { status: 'approved' } });
        const rejectedCount = await Product.count({ where: { status: 'rejected' } });
        const pendingCount = await Product.count({ where: { status: 'pending' } });

        const sellers = await User.findAll({
            attributes: [
                'UserID',
                'Username',
                'Email',
                'PhoneNumber',
                'status',
                [sequelize.fn('COUNT', sequelize.col('Products.ProductID')), 'productCount']
            ],
            include: [{
                model: Product,
                as: 'Products',
                attributes: [],
                required: false
            }],
            group: ['User.UserID', 'User.Username', 'User.Email', 'User.PhoneNumber', 'User.status']
        });

        res.render('admin', {
            products,
            publishedCount,
            rejectedCount,
            pendingCount,
            sellers
        });
    } catch (error) {
        console.error('Ошибка в админ-панели:', error);
        return res.render('error', { errorCode: 500, errorMessage: 'Ошибка сервера' });
    }
});

router.post('/approve/:productId', checkAdmin, async (req, res) => {
    try {
        const product = await Product.findByPk(req.params.productId);
        if (product) {
            product.status = 'approved';
            await product.save();
            res.redirect('/admin');
        } else {
            return res.render('error', { errorCode: 404, errorMessage: 'Объявление не найдено' });
        }
    } catch (error) {
        return res.render('error', { errorCode: 500, errorMessage: 'Ошибка сервера' });
    }
});

router.post('/reject/:productId', checkAdmin, async (req, res) => {
    try {
        const product = await Product.findByPk(req.params.productId);
        if (product) {
            product.status = 'rejected';
            await product.save();
            res.redirect('/admin');
        } else {
            return res.render('error', { errorCode: 404, errorMessage: 'Объявление не найдено' });
        }
    } catch (error) {
        return res.render('error', { errorCode: 500, errorMessage: 'Ошибка сервера' });
    }
});

router.post('/block/:userId', checkAdmin, async (req, res) => {
    try {
        const user = await User.findByPk(req.params.userId);
        if (user) {
            user.status = 'blocked';
            await user.save();
            res.redirect('/admin');
        } else {
            return res.render('error', { errorCode: 404, errorMessage: 'Пользователь не найден' });
        }
    } catch (error) {
        return res.render('error', { errorCode: 500, errorMessage: 'Ошибка сервера' });
    }
});

router.post('/unblock/:userId', checkAdmin, async (req, res) => {
    try {
        const user = await User.findByPk(req.params.userId);
        if (user) {
            user.status = 'active';
            await user.save();
            res.redirect('/admin');
        } else {
            return res.render('error', { errorCode: 404, errorMessage: 'Пользователь не найден' });
        }
    } catch (error) {
        return res.render('error', { errorCode: 500, errorMessage: 'Ошибка сервера' });
    }
});

module.exports = router;