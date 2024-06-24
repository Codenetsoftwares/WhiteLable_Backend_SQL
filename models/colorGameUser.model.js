import { DataTypes, Model } from 'sequelize';
import sequelize from '../db.js';
import bcrypt from 'bcrypt';
import { v4 as uuid4 } from 'uuid';

class colorGameUserSchema extends Model {}
colorGameUserSchema.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    adminId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    userName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    userId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    phoneNumber: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    roles: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    eligibilityCheck: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    walletId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    balance: {
      type: DataTypes.INTEGER,
      defaultValue: 0.0,
    },
    exposure: {
      type: DataTypes.INTEGER,
      defaultValue: 0.0,
    },
    marketListExposure: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: []
    },
    lastLoginTime: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    ip: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    country: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    region: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    timezone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    loadBalance: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    createdById: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    createdByUser: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    locked: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    hyperActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    masterActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    superActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    whiteActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    subHyperActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    subAdminActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    subMasterActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    subSuperActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    subWhiteActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    checkActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    path: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    creditRefs: {
      type: DataTypes.JSON,
      allowNull: true, 
      defaultValue: [],
    },
    partnerships: {
      type: DataTypes.JSON,
      allowNull: true, 
      defaultValue: [],
    },
  },
  {
    sequelize,
    modelName: 'colorGameUserSchema',
    tableName: 'colorGameUserSchema',
    timestamps: false,
  },
);
export default colorGameUserSchema;
