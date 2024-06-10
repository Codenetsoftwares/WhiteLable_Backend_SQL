import { DataTypes } from 'sequelize';
import sequelize from '../db.js';

const trash = sequelize.define(
  'trash',
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    trashId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    roles: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    userName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    balance: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    loadBalance: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    creditRefs: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    partnerships: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    createdById: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    createdByUser: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    adminId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    timestamps: false,
  },
);

export default trash;
