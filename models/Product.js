const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

const Product = sequelize.define('Product', {
    ProductID: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    UserID: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    ProductName: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    ImageURL: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    Description: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    Price: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    Category:{
        type: DataTypes.STRING,
        allowNull: false,
    },
    status: {
        type: DataTypes.STRING,
        defaultValue: 'pending',
        allowNull: false
    }

}, {
    timestamps: true,
    tableName: 'Product',
});

Product.belongsTo(User, { foreignKey: 'UserID', as: 'User' });
User.hasMany(Product, { foreignKey: 'UserID', as: 'Products' });

module.exports = Product;