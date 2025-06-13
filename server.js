const express = require('express');
const PORT = 3000;
const path = require('path');
const User = require('./models/User');
const Role = require('./models/Role');
const Product = require('./models/Product');
const Cart = require('./models/Cart');
const bcrypt = require('bcrypt');
const sequelize = require('./config/database');
const { sessionMiddleware } = require('./middleware');
const app = express();
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const adminRoutes = require('./routes/admin');

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(sessionMiddleware);
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use('/admin', adminRoutes);
app.use('/auth', authRoutes);
app.use('/product', productRoutes);

async function initializeDatabase() {
    try {
        await sequelize.sync({  });
        console.log('Database synced successfully');
        const Role = require('./models/Role');
        const rolesCount = await Role.count();
        if (rolesCount === 0) {
            await Role.bulkCreate([
                { RoleName: 'User' },
                { RoleName: 'Admin' },
            ]);
            console.log('Roles added successfully');
        }
    } catch (err) {
        console.error('Unable to connect to the database:', err);
    }
}

initializeDatabase();

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/html/index.html'));
});

app.get('/brend', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/html/brend.html'));
});
app.get('/news', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/html/news.html'));
});
app.get('/support', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/html/support.html'));
});


app.use((req, res, next) => {
    res.render('error', { errorCode: 404, errorMessage: 'Страница не найдена' });
});

app.listen(PORT, () => {
    console.log(`Сервер работает на http://localhost:${PORT}`);
});