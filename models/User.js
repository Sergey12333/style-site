const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Role = require('./Role');

const User = sequelize.define('User', {
    UserID: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    Username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    status: {
        type: DataTypes.STRING,
        defaultValue: 'active',
        allowNull: false
    },
    PhoneNumber: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
    },
    DateOfBirth: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    RoleID: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    Email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    Password: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    Avatar: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: null
    }
}, {
    timestamps: false,
    tableName: 'User',
});

User.belongsTo(Role, { foreignKey: 'RoleID', as: 'Role' });
Role.hasMany(User, { foreignKey: 'RoleID', as: 'Users' });

module.exports = User;