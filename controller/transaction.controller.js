import { apiResponseErr, apiResponseSuccess, apiResponsePagination } from '../helper/errorHandler.js';
import selfTransactions from '../models/selfTransaction.model.js';
import transaction from '../models/transactions.model.js';
import admins from '../models/admin.model.js';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import { statusCode } from '../helper/statusCodes.js';
import { Sequelize } from 'sequelize';
import { messages } from '../constructor/string.js';
import axios from 'axios';
import { calculateLoadBalance } from './admin.controller.js';
import { Op } from 'sequelize'

export const depositTransaction = async (req, res) => {
  try {
    const { amount } = req.body;
    const adminId = req.params.adminId;
    const admin = await admins.findOne({ where: { adminId } });

    if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
      return res.status(statusCode.badRequest).json(apiResponseErr(null, false, statusCode.badRequest, 'Invalid amount'));
    }

    if (!admin) {
      return res.status(statusCode.badRequest).json(apiResponseErr(null, false, statusCode.badRequest, messages.adminNotFound));
    }

    const depositAmount = Math.round(parseFloat(amount));
    const depositTransactionData = {
      amount: depositAmount,
      userName: admin.userName,
      date: new Date(),
      transactionType: 'deposit',
    };

    const newDepositBalance = admin.depositBalance + depositAmount;
    const newAdminBalance = admin.balance + depositAmount;

    await admin.update({
      balance: newAdminBalance,
      depositBalance: newDepositBalance,
    });

    await selfTransactions.create({
      selfTransactionId: uuidv4(),
      adminId: adminId,
      amount: depositTransactionData.amount,
      userName: depositTransactionData.userName,
      date: depositTransactionData.date,
      transactionType: depositTransactionData.transactionType,
    });

    return res.status(statusCode.create).json(apiResponseSuccess(null, true, statusCode.create, 'Balance Deposit Successfully'));
  } catch (error) {
    res
      .status(statusCode.internalServerError)
      .send(apiResponseErr(error.data ?? null, false, error.responseCode ?? statusCode.internalServerError, error.errMessage ?? error.message));
  }
};

export const transferAmount = async (req, res) => {
  try {
    const { receiveUserId, transferAmount, withdrawalAmt, remarks, password } = req.body;
    const adminId = req.params.adminId;

    const senderAdmin = await admins.findOne({ where: { adminId } });
    if (!senderAdmin) {
      return res.status(statusCode.badRequest).json(apiResponseErr(null, false, statusCode.badRequest, messages.adminNotFound));
    }

    const isPasswordValid = await bcrypt.compare(password, senderAdmin.password);
    if (!isPasswordValid) {
      return res.status(statusCode.badRequest).json(apiResponseErr(null, false, statusCode.badRequest, 'Invalid password for the transaction'));
    }

    const receiverAdmin = await admins.findOne({ where: { adminId: receiveUserId } });
    if (!receiverAdmin) {
      return res.status(statusCode.badRequest).json(apiResponseErr(null, false, statusCode.badRequest, 'Receiver Admin not found'));
    }

    if (senderAdmin.isActive === false) {
      return res.status(statusCode.badRequest).json(apiResponseErr(null, false, statusCode.badRequest, 'Sender Admin is inactive'));
    }

    if (receiverAdmin.isActive === false) {
      return res.status(statusCode.badRequest).json(apiResponseErr(null, false, statusCode.badRequest, 'Receiver Admin is inactive'));
    }

    if (senderAdmin.locked === false) {
      return res.status(statusCode.unauthorize).json(apiResponseErr(null, false, statusCode.unauthorize, "Sender Account is locked"));
    }

    if (receiverAdmin.locked === false) {
      return res.status(statusCode.badRequest).json(apiResponseErr(null, false, statusCode.badRequest, "Receiver Account is locked"));
    }

    if (transferAmount !== undefined && typeof transferAmount !== 'number') {
      return res.status(statusCode.badRequest).json(apiResponseErr(null, false, statusCode.badRequest, 'Transfer amount must be a number'));
    }

    if (withdrawalAmt !== undefined && typeof withdrawalAmt !== 'number') {
      return res.status(statusCode.badRequest).json(apiResponseErr(null, false, statusCode.badRequest, 'Withdrawal amount must be a number'));
    }

    const parsedTransferAmount = parseFloat(transferAmount);
    const parsedWithdrawalAmt = parseFloat(withdrawalAmt);

    if (parsedWithdrawalAmt) {
      if (receiverAdmin.balance < parsedWithdrawalAmt) {
        return res.status(statusCode.badRequest).json(apiResponseErr(null, false, statusCode.badRequest, 'Insufficient Balance For Withdrawal'));
      }


      const deductionBalance = receiverAdmin.balance - parsedWithdrawalAmt;
      const creditAmount = senderAdmin.balance + parsedWithdrawalAmt;

      const withdrawalRecord = {
        transactionType: 'withdrawal',
        amount: Math.round(parsedWithdrawalAmt),
        transferFromUserAccount: receiverAdmin.userName,
        transferToUserAccount: senderAdmin.userName,
        userName: receiverAdmin.userName,
        date: new Date(),
        remarks,
        currentBalance: deductionBalance
      };

      await receiverAdmin.update({ balance: deductionBalance });
      await senderAdmin.update({ balance: creditAmount });

      await transaction.create({
        transactionId: uuidv4(),
        adminId,
        ...withdrawalRecord,
      });

      const dataToSend = {
        ...withdrawalRecord,
        userId: receiveUserId,
        transactionId: withdrawalRecord.transactionId,
        type: 'debit',
      };

      let message = '';
      try {
        const { data: response } = await axios.post('https://cg.server.dummydoma.in/api/extrnal/balance-update', dataToSend);
        console.log('Balance update response:', response);

        if (!response.success) {
          if (response.responseCode === 400 && response.errMessage === 'User Not Found') {
            message = 'Failed to update user balance.';
          }
        }
      } catch (error) {
        console.error('Error updating balance:', error);
        message = 'Please register in the portal.';
      }

      await calculateLoadBalance(adminId);

      return res.status(statusCode.create).json(apiResponseSuccess(null, true, statusCode.create, 'Balance Deducted Successfully' + ' ' + message));
    } else {
      if (senderAdmin.balance < parsedTransferAmount) {
        return res.status(statusCode.badRequest).json(apiResponseErr(null, false, statusCode.badRequest, 'Insufficient Balance For Transfer'));
      }

      // const transferRecordDebit = {
      //   transactionType: 'debit',
      //   amount: Math.round(parsedTransferAmount),
      //   transferFromUserAccount: senderAdmin.userName,
      //   transferToUserAccount: receiverAdmin.userName,
      //   userName: senderAdmin.userName,
      //   date: new Date(),
      //   remarks,
      // };


      const senderBalance = senderAdmin.balance - parsedTransferAmount;
      const receiverBalance = receiverAdmin.balance + parsedTransferAmount;

      const transferRecordCredit = {
        transactionType: 'credit',
        amount: Math.round(parsedTransferAmount),
        transferFromUserAccount: senderAdmin.userName,
        transferToUserAccount: receiverAdmin.userName,
        userName: receiverAdmin.userName,
        date: new Date(),
        remarks,
        currentBalance: receiverBalance
      }

      await receiverAdmin.update({ balance: receiverBalance });
      await senderAdmin.update({ balance: senderBalance });

      // await transaction.create({
      //   transactionId: uuidv4(),
      //   adminId,
      //   ...transferRecordDebit,
      // });

      await transaction.create({
        transactionId: uuidv4(),
        adminId,
        ...transferRecordCredit,
      });

      const dataToSend = {
        ...transferRecordCredit,
        userId: receiveUserId,
        transactionId: transferRecordCredit.transactionId,
        type: 'credit',
      };

      let message = '';
      try {
        const { data: response } = await axios.post('https://cg.server.dummydoma.in/api/extrnal/balance-update', dataToSend);
        console.log('Balance update response:', response);

        if (!response.success) {
          if (response.responseCode === 400 && response.errMessage === 'User Not Found') {
            message = 'Failed to update user balance.';
          }
        }
      } catch (error) {
        console.error('Error updating balance:', error);
        message = 'Please register in the portal.';
      }

      await calculateLoadBalance(adminId);

      return res.status(statusCode.create).json(apiResponseSuccess(null, true, statusCode.create, 'Balance Debited Successfully' + ' ' + message));
    }
  } catch (error) {
    console.error('Error in transferAmount:', error);
    res.status(statusCode.internalServerError).send(apiResponseErr(error.data ?? null, false, error.responseCode ?? statusCode.internalServerError, error.errMessage ?? error.message));
  }
};

export const transactionView = async (req, res) => {
  try {
    const userName = req.params.userName;
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const dataType = req.query.dataType;

    let startDate, endDate;

    if (dataType === 'live') {
      const today = new Date();
      startDate = new Date(today).setHours(0, 0, 0, 0);
      endDate = new Date(today).setHours(23, 59, 59, 999);
    } else if (dataType === 'olddata') {
      if (req.query.startDate && req.query.endDate) {
        startDate = new Date(req.query.startDate).setHours(0, 0, 0, 0);
        endDate = new Date(req.query.endDate).setHours(23, 59, 59, 999);
      } else {
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        startDate = new Date(oneYearAgo).setHours(0, 0, 0, 0);
        endDate = new Date().setHours(23, 59, 59, 999);
      }
    } else if (dataType === 'backup') {
      if (req.query.startDate && req.query.endDate) {
        startDate = new Date(req.query.startDate).setHours(0, 0, 0, 0);
        endDate = new Date(req.query.endDate).setHours(23, 59, 59, 999);
        const maxAllowedDate = new Date(startDate);
        maxAllowedDate.setMonth(maxAllowedDate.getMonth() + 3);
        if (endDate > maxAllowedDate) {
          return res.status(statusCode.badRequest)
            .send(apiResponseErr([], false, statusCode.badRequest, 'The date range for backup data should not exceed 3 months.'));
        }
      } else {
        const today = new Date();
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(today.getMonth() - 2);
        startDate = new Date(threeMonthsAgo.setHours(0, 0, 0, 0));
        endDate = new Date(today.setHours(23, 59, 59, 999));
      }
    } else {
      return res.status(statusCode.success)
        .send(apiResponseSuccess([], true, statusCode.success, 'Data not found.'));
    }

    const admin = await admins.findOne({ where: { userName } });

    if (!admin) {
      return res.status(statusCode.badRequest).send(apiResponseErr([], false, statusCode.badRequest, messages.adminNotFound));
    }

    const adminUserName = admin.userName;

    let transactionQuery = {
      where: {
        [Sequelize.Op.or]: [
          { transferFromUserAccount: adminUserName },
          { transferToUserAccount: adminUserName },
        ],
      },
      order: [['date', 'DESC']],
    };

    if (startDate && endDate) {
      transactionQuery.where.date = {
        [Sequelize.Op.between]: [startDate, endDate],
      };
    } else if (startDate) {
      transactionQuery.where.date = {
        [Sequelize.Op.gte]: startDate,
      };
    } else if (endDate) {
      transactionQuery.where.date = {
        [Sequelize.Op.lte]: endDate,
      };
    }

    const transactionData = await transaction.findAll(transactionQuery);
    if (transactionData.length === 0) {
      return res.status(statusCode.success).send(apiResponseSuccess([], true, statusCode.success, "No Data Found"));
    }
    const totalItems = transactionData.length;
    let allData = JSON.parse(JSON.stringify(transactionData));

    const reversedData = [...allData].reverse();

    let runningBalance = 0;

    reversedData.forEach((data) => {
      if (data.transferFromUserAccount === adminUserName) {
        runningBalance = data.currentBalance;
      } else if (data.transferToUserAccount === adminUserName) {
        runningBalance = data.currentBalance;
      }
      data.balance = runningBalance;
    });

    allData = reversedData.reverse();

    const totalPages = Math.ceil(totalItems / pageSize);

    const skip = (page - 1) * pageSize;
    const paginatedData = allData.slice(skip, skip + pageSize);

    const paginationData = apiResponsePagination(page, totalPages, totalItems, pageSize);

    return res
      .status(statusCode.success)
      .send(apiResponseSuccess(paginatedData, true, statusCode.success, messages.success, paginationData));
  } catch (error) {
    res.status(statusCode.internalServerError).send(
      apiResponseErr(
        null,
        false,
        statusCode.internalServerError,
        error.message
      )
    );
  }
};

export const accountStatement = async (req, res) => {
  try {
    const adminId = req.params.adminId;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const page = parseInt(req.query.page) || 1;
    const dataType = req.query.dataType;
    let startDate, endDate;
    if (dataType === 'live') {
      const today = new Date();
      startDate = new Date(today).setHours(0, 0, 0, 0);
      endDate = new Date(today).setHours(23, 59, 59, 999);
    } else if (dataType === 'olddata') {
      if (req.query.startDate && req.query.endDate) {
        startDate = new Date(req.query.startDate).setHours(0, 0, 0, 0);
        endDate = new Date(req.query.endDate).setHours(23, 59, 59, 999);
      } else {
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        startDate = new Date(oneYearAgo).setHours(0, 0, 0, 0);
        endDate = new Date().setHours(23, 59, 59, 999);
      }
    } else if (dataType === 'backup') {
      if (req.query.startDate && req.query.endDate) {
        startDate = new Date(req.query.startDate).setHours(0, 0, 0, 0);
        endDate = new Date(req.query.endDate).setHours(23, 59, 59, 999);
        const maxAllowedDate = new Date(startDate);
        maxAllowedDate.setMonth(maxAllowedDate.getMonth() + 3);
        if (endDate > maxAllowedDate) {
          return res.status(statusCode.badRequest)
            .send(apiResponseErr([], false, statusCode.badRequest, 'The date range for backup data should not exceed 3 months.'));
        }
      } else {
        const today = new Date();
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(today.getMonth() - 2);
        startDate = new Date(threeMonthsAgo.setHours(0, 0, 0, 0));
        endDate = new Date(today.setHours(23, 59, 59, 999));
      }
    } else {
      return res.status(statusCode.success)
        .send(apiResponseSuccess([], true, statusCode.success, 'Data not found.'));
    }

    const admin = await admins.findOne({ where: { adminId } });

    if (!admin) {
      return res.status(statusCode.badRequest).send(apiResponseErr([], false, statusCode.badRequest, messages.adminNotFound));
    }

    const adminUserName = admin.userName;
    const adminMainBalance = admin.balance;

    const transactionQuery = {
      where: {
        [Sequelize.Op.or]: [
          { adminId },
          { transferToUserAccount: adminUserName },
        ],
        date: {
          [Op.between]: [startDate, endDate],
        },
      },
      order: [['date', 'DESC']],
      limit: pageSize,
      offset: (page - 1) * pageSize,
    };

    const transferAmount = await transaction.findAndCountAll(transactionQuery);
    if (transferAmount.rows.length === 0) {
      return res.status(statusCode.success).send(apiResponseSuccess([], true, statusCode.success, "No Data Found"));
    }

    const totalCount = transferAmount.count;
    const totalPages = Math.ceil(totalCount / pageSize);

    let runningBalance = adminMainBalance;

    const dataWithBalance = transferAmount.rows.map((transaction) => {
      if (transaction.transactionType === 'credit' || transaction.transactionType === 'withdrawal') {
        runningBalance = transaction.currentBalance;
      }

      let adminBalanceForTransaction = null;
      if (transaction.transferFromUserAccount === adminUserName) {
        adminBalanceForTransaction = adminMainBalance;
      }

      return {
        ...transaction.toJSON(),
        balance: runningBalance,
        adminMainBalance: adminBalanceForTransaction
      };
    });

    const paginationData = apiResponsePagination(page, totalPages, totalCount, pageSize);

    return res.status(statusCode.success)
      .send(apiResponseSuccess(dataWithBalance, true, statusCode.success, messages.success, paginationData));

  } catch (error) {
    res.status(statusCode.internalServerError)
      .send(apiResponseErr(error.data ?? null, false, error.responseCode ?? statusCode.internalServerError, error.errMessage ?? error.message));
  }
};



export const viewBalance = async (req, res) => {
  try {
    const adminId = req.params.adminId;
    const admin = await admins.findOne({ where: { adminId } });
    const amount = {
      balance: admin.balance,
    };
    return res.status(statusCode.success).json(apiResponseSuccess(amount, statusCode.success, true, 'Successfully'));
  } catch (error) {
    res
      .status(statusCode.internalServerError)
      .send(apiResponseErr(error.data ?? null, false, error.responseCode ?? statusCode.internalServerError, error.errMessage ?? error.message));
  }
};


export const viewAddBalance = async (req, res) => {
  try {
    const { adminId } = req.params;
    let { page = 1, limit = 10 } = req.query;
    page = parseInt(page)
    limit = parseInt(limit)
    const offset = (page - 1) * limit;
    const allTransactions = await selfTransactions.findAll({ where: { adminId } });
    if (allTransactions.length === 0) {
      return res
        .status(statusCode.success)
        .send(apiResponseSuccess({ transactions: [] }, true, statusCode.success, 'Data Not Found'));
    }
    const paginatedTransactions = await selfTransactions.findAll({
      where: { adminId },
      order: [['createdAt', 'DESC']],
      offset,
      limit,
    });
    const totalItems = await selfTransactions.count({ where: { adminId } });
    const totalPages = Math.ceil(totalItems / limit)
    const balanceInfo = {
      transactions: paginatedTransactions.map((transaction) => ({
        amount: transaction.amount,
        date: transaction.date
      })),
    };
    return res
      .status(statusCode.success)
      .send(apiResponseSuccess(balanceInfo, true, statusCode.success, 'Balance Retrieved Successfully!', {
        page,
        limit,
        totalItems,
        totalPages,
      }));
  } catch (error) {
    res
      .status(statusCode.internalServerError)
      .send(apiResponseErr(null, false, statusCode.internalServerError, error.message));
  }
};

