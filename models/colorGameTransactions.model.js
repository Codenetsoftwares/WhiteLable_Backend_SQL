import { DataTypes, Model } from 'sequelize';
import sequelize from '../db.js';

class colorGameTransactionRecord extends Model {}

colorGameTransactionRecord.init(
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    transactionType: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    amount: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'colorGameTransactionRecord',
    timestamps: true,
  },
);

export default colorGameTransactionRecord;
