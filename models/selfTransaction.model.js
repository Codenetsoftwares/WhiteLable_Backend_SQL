// Import required modules
import { DataTypes } from 'sequelize';
import sequelize from '../db.js';

const SelfTransaction = sequelize.define('selfTransactions', {
  id: {
    type: DataTypes.BIGINT,
    autoIncrement: true,
    primaryKey: true,
  },
  selfTransactionId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  adminId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  amount: {
    type: DataTypes.DECIMAL(10, 0),
    allowNull: false,
  },
  userName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  date: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  transactionType: {
    type: DataTypes.STRING,
    allowNull: false,
  },
}, {
  timestamps: false,
});

export default SelfTransaction;
