const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const Product = require('../models/Product');
const Cart = require('../models/Cart');
const checkAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 2) {
        next();
    } else {
        return res.render('error', { errorCode: 403, errorMessage: 'Доступ запрещен' });
    }
};

const checkProductIdIsNumeric = (req, res, next) => {
    const productId = req.params.productId;
    if (!/^\d+$/.test(productId)) {
        console.log(`Некорректный productId: ${productId}, возвращаем 404`);
        return res.render('error', { errorCode: 404, errorMessage: 'Страница не найдена' });
    }
    next();
};

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../public/uploads'));
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

router.post('/add-product', upload.single('productImage'), async (req, res) => {
    if (!req.session.user) {
        return res.render('error', { errorCode: 401, errorMessage: 'Необходимо авторизоваться для добавления товара' });
    }
    if (req.session.user.role === 2) {
        return res.render('error', { errorCode: 403, errorMessage: 'Администраторам запрещено добавлять товары' });
    }
    const { productName, description, price, category } = req.body;
    if (!productName || !description || !price || !category || !req.file) {
        return res.render('error', { errorCode: 400, errorMessage: 'Заполните все поля, выберите категорию и загрузите изображение' });
    }
    try {
        const imageUrl = '/uploads/' + req.file.filename;
        const newProduct = await Product.create({
            ProductName: productName,
            Description: description,
            Price: price,
            ImageURL: imageUrl,
            UserID: req.session.user.id,
            Category: category
        });
        return res.status(200).redirect('/auth/profile');
    } catch (error) {
        console.log('Ошибка при добавлении товара:', error);
        return res.render('error', { errorCode: 500, errorMessage: 'Ошибка при добавлении товара' });
    }
});

router.get('/catalog', async (req, res) => {
    try {
        const products = await Product.findAll({ where: { status: 'approved' } });
        const productsByCategory = {};
        products.forEach(product => {
            const category = product.Category;
            if (!productsByCategory[category]) {
                productsByCategory[category] = [];
            }
            productsByCategory[category].push(product);
        });
        res.render('catalog', { productsByCategory: productsByCategory });
    } catch (error) {
        console.log('Ошибка при получении товаров:', error);
        return res.render('error', { errorCode: 500, errorMessage: 'Ошибка при получении товаров' });
    }
});



router.post('/add-to-cart/:productId', async (req, res) => {
    if (!req.session.user) {
        return res.render('error', { errorCode: 401, errorMessage: 'Вы должны быть авторизованы для добавления товара в корзину' });
    }
    if (req.session.user.role === 2) {
        return res.render('error', { errorCode: 403, errorMessage: 'Администраторам не разрешено добавлять товары в корзину' });
    }
    const productId = req.params.productId;
    const userId = req.session.user.id;

    try {
        const product = await Product.findByPk(productId);
        if (!product) {
            return res.render('error', { errorCode: 404, errorMessage: 'Товар не найден' });
        }
        if (product.status !== 'approved') {
            return res.render('error', { errorCode: 403, errorMessage: 'Товар еще не одобрен администратором' });
        }

        let cartItem = await Cart.findOne({
            where: {
                UserID: userId,
                ProductID: productId
            }
        });

        if (cartItem) {
            cartItem.Quantity += 1;
            await cartItem.save();
        } else {
            await Cart.create({
                UserID: userId,
                ProductID: productId,
                Quantity: 1
            });
        }
        res.redirect('/product/cart');
    } catch (error) {
        console.error('Ошибка при добавлении в корзину:', error);
        return res.render('error', { errorCode: 500, errorMessage: 'Ошибка при добавлении в корзину' });
    }
});

router.get('/cart', async (req, res) => {
    if (!req.session.user) {
        console.log('Нет пользователя в сессии, редирект на логин');
        return res.redirect('/auth/login');
    }
    console.log('Пользователь в сессии:', req.session.user);
    console.log('Роль пользователя:', req.session.user.role);
    if (req.session.user.role === 2) {
        console.log('Администратор пытается зайти в корзину, ошибка 403');
        return res.render('error', { errorCode: 403, errorMessage: 'Администраторам не разрешено просматривать корзину' });
    }
    try {
        const cartItems = await Cart.findAll({
            where: { UserID: req.session.user.id },
            include: [{
                model: Product,
                as: 'Product',
                where: { status: 'approved' }
            }]
        });
        console.log('Корзина пользователя:', cartItems);
        res.render('cart', { cartItems: cartItems });
    } catch (error) {
        console.error('Ошибка при получении корзины:', error);
        return res.render('error', { errorCode: 500, errorMessage: 'Ошибка при получении корзины' });
    }
});

router.post('/update-cart/:cartId', async (req, res) => {
    if (!req.session.user) {
        return res.render('error', { errorCode: 401, errorMessage: 'Необходимо авторизоваться' });
    }
    if (req.session.user.role === 2) {
        return res.render('error', { errorCode: 403, errorMessage: 'Администраторам не разрешено обновлять корзину' });
    }
    const cartId = req.params.cartId;
    const { quantity } = req.body;

    try {
        const cartItem = await Cart.findByPk(cartId, {
            include: [{ model: Product, as: 'Product' }]
        });
        if (!cartItem || cartItem.UserID !== req.session.user.id) {
            return res.render('error', { errorCode: 403, errorMessage: 'Доступ запрещен' });
        }
        if (cartItem.Product.status !== 'approved') {
            await cartItem.destroy();
            return res.redirect('/product/cart');
        }
        if (quantity <= 0) {
            await cartItem.destroy();
        } else {
            cartItem.Quantity = quantity;
            await cartItem.save();
        }
        res.redirect('/product/cart');
    } catch (error) {
        console.error('Ошибка при обновлении корзины:', error);
        return res.render('error', { errorCode: 500, errorMessage: 'Ошибка при обновлении корзины' });
    }
});

router.post('/remove-from-cart/:cartId', async (req, res) => {
    if (!req.session.user) {
        return res.render('error', { errorCode: 401, errorMessage: 'Необходимо авторизоваться' });
    }
    if (req.session.user.role === 2) {
        return res.render('error', { errorCode: 403, errorMessage: 'Администраторам не разрешено удалять товары из корзины' });
    }
    const cartId = req.params.cartId;

    try {
        const cartItem = await Cart.findByPk(cartId);
        if (!cartItem || cartItem.UserID !== req.session.user.id) {
            return res.render('error', { errorCode: 403, errorMessage: 'Доступ запрещен' });
        }
        await cartItem.destroy();
        res.redirect('/product/cart');
    } catch (error) {
        console.error('Ошибка при удалении из корзины:', error);
        return res.render('error', { errorCode: 500, errorMessage: 'Ошибка при удалении из корзины' });
    }
});

router.get('/:productId', checkAdmin, checkProductIdIsNumeric, async (req, res) => {
    try {
        const product = await Product.findByPk(req.params.productId);
        if (!product) {
            return res.render('error', { errorCode: 404, errorMessage: 'Товар не найден' });
        }
        res.json(product);
    } catch (error) {
        console.error('Ошибка при получении продукта:', error);
        return res.render('error', { errorCode: 500, errorMessage: 'Ошибка сервера' });
    }
});

module.exports = router;