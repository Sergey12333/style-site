const sequelize = require('../config/database');
const { DataTypes } = require('sequelize');
const User = require('./User');
const Product = require('./Product');

const Cart = sequelize.define('Cart', {
    CartID: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    UserID: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    ProductID: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    Quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1
    }
}, {
    timestamps: false,
    tableName: 'Cart'
});

Cart.belongsTo(User, { foreignKey: 'UserID', as: 'User' });
User.hasMany(Cart, { foreignKey: 'UserID', as: 'Carts' });
Cart.belongsTo(Product, { foreignKey: 'ProductID', as: 'Product' });
Product.hasMany(Cart, { foreignKey: 'ProductID', as: 'Carts' });

module.exports = Cart;