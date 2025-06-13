const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('style', 'Oksana', 'Qw1er2ty3ui4*', {
    host: process.env.DB_HOST,
    dialect: 'postgres',
    logging: false,
});

module.exports = sequelize;