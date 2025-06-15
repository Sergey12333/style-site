// config/database.js
const { Sequelize } = require('sequelize');

// Если задана переменная окружения DATABASE_URL (Render), она возьмётся
// иначе — fallback на локальный Postgres с DB_HOST или 'localhost'
const connectionString =
  process.env.DATABASE_URL ||
  `postgres://Oksana:Qw1er2ty3ui4*@${process.env.DB_HOST || 'localhost'}:5432/style`;

const sequelize = new Sequelize(connectionString, {
  dialect: 'postgres',
  protocol: 'postgres',
  // SSL-туннель нужен только когда мы используем Render DATABASE_URL
  dialectOptions: process.env.DATABASE_URL
    ? { ssl: { require: true, rejectUnauthorized: false } }
    : {},
  logging: false,
});

module.exports = sequelize;
