import { apiResponseErr, apiResponseSuccess, apiResponsePagination } from '../helper/errorHandler.js';
import selfTransactions from '../models/selfTransaction.model.js';
import transaction from '../models/transactions.model.js';
import admins from '../models/admin.model.js';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import { statusCode } from '../helper/statusCodes.js';
import { Sequelize } from 'sequelize';
import { messages } from '../constructor/string.js';

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

    if (!senderAdmin.isActive) {
      return res.status(statusCode.badRequest).json(apiResponseErr(null, false, statusCode.badRequest, 'Sender Admin is inactive'));
    }

    if (!receiverAdmin.isActive) {
      return res.status(statusCode.badRequest).json(apiResponseErr(null, false, statusCode.badRequest, 'Receiver Admin is inactive'));
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

      const withdrawalRecord = {
        transactionType: 'withdrawal',
        amount: Math.round(parsedWithdrawalAmt),
        transferFromUserAccount: receiverAdmin.userName,
        transferToUserAccount: senderAdmin.userName,
        userName: senderAdmin.userName,
        date: new Date(),
        remarks,
      };

      const deductionBalance = receiverAdmin.balance - parsedWithdrawalAmt;
      const deductionLoadBalance = receiverAdmin.loadBalance - parsedWithdrawalAmt;
      const creditAmount = senderAdmin.balance + parsedWithdrawalAmt;

      await receiverAdmin.update({
        balance: deductionBalance,
        loadBalance: deductionLoadBalance,
      });

      await senderAdmin.update({
        balance: creditAmount,
      });

      await transaction.create({
        transactionId: uuidv4(),
        adminId: adminId,
        userName: withdrawalRecord.userName,
        amount: withdrawalRecord.amount,
        date: withdrawalRecord.date,
        transactionType: withdrawalRecord.transactionType,
        remarks: withdrawalRecord.remarks,
        transferFromUserAccount: withdrawalRecord.transferFromUserAccount,
        transferToUserAccount: withdrawalRecord.transferToUserAccount,
      });

      return res.status(statusCode.create).json(apiResponseSuccess(null, true, statusCode.create, 'Balance Deducted Successfully'));
    } else {
      if (senderAdmin.balance < parsedTransferAmount) {
        return res.status(statusCode.badRequest).json(apiResponseErr(null, false, statusCode.badRequest, 'Insufficient Balance For Transfer'));
      }

      const transferRecordDebit = {
        transactionType: 'debit',
        amount: Math.round(parsedTransferAmount),
        transferFromUserAccount: senderAdmin.userName,
        transferToUserAccount: receiverAdmin.userName,
        userName: senderAdmin.userName,
        date: new Date(),
        remarks,
      };

      const transferRecordCredit = {
        transactionType: 'credit',
        amount: Math.round(parsedTransferAmount),
        transferFromUserAccount: senderAdmin.userName,
        transferToUserAccount: receiverAdmin.userName,
        userName: receiverAdmin.userName,
        date: new Date(),
        remarks,
      };

      const senderBalance = senderAdmin.balance - parsedTransferAmount;
      const receiverBalance = receiverAdmin.balance + parsedTransferAmount;
      const receiverLoadBalance = receiverAdmin.loadBalance + parsedTransferAmount;

      await receiverAdmin.update({
        balance: receiverBalance,
        loadBalance: receiverLoadBalance,
      });

      await senderAdmin.update({
        balance: senderBalance,
      });

      await transaction.create({
        transactionId: uuidv4(),
        adminId: adminId,
        userName: transferRecordDebit.userName,
        amount: transferRecordDebit.amount,
        date: transferRecordDebit.date,
        transactionType: transferRecordDebit.transactionType,
        remarks: transferRecordDebit.remarks,
        transferFromUserAccount: transferRecordDebit.transferFromUserAccount,
        transferToUserAccount: transferRecordDebit.transferToUserAccount,
      });

      await transaction.create({
        transactionId: uuidv4(),
        adminId: adminId,
        userName: transferRecordCredit.userName,
        amount: transferRecordCredit.amount,
        date: transferRecordCredit.date,
        transactionType: transferRecordCredit.transactionType,
        remarks: transferRecordCredit.remarks,
        transferFromUserAccount: transferRecordCredit.transferFromUserAccount,
        transferToUserAccount: transferRecordCredit.transferToUserAccount,
      });

      return res.status(statusCode.create).json(apiResponseSuccess(null, true, statusCode.create, 'Balance Debited Successfully'));
    }
  } catch (error) {
    console.log(error);
    res.status(statusCode.internalServerError).send(apiResponseErr(error.data ?? null, false, error.responseCode ?? statusCode.internalServerError, error.errMessage ?? error.message));
  }
};

export const transactionView = async (req, res) => {
  try {
    const userName = req.params.userName;
    const page = parseInt(req.query.page) || 1;
    const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();
    endDate.setDate(endDate.getDate() + 1);
    const pageSize = parseInt(req.query.pageSize) || 5;

    let balances = 0;
    let debitBalances = 0;
    let withdrawalBalances = 0;

    const admin = await admins.findOne({ where: { userName } });
    if (!admin) {
      return res.status(statusCode.badRequest).json(apiResponseErr(null, false, statusCode.badRequest, messages.adminNotFound));
    }

    const adminId = admin.adminId;

    let transactionQuery = { where: { adminId } };

    if (startDate) {
      transactionQuery.where.date = { [Sequelize.Op.gte]: startDate };
    }

    transactionQuery.order = [['date', 'DESC']];

    const transactionData = await transaction.findAll(transactionQuery);

    const totalItems = transactionData.length;
    const totalPages = Math.ceil(totalItems / pageSize);

    const skip = (page - 1) * pageSize;
    const endIndex = page * pageSize;

    const paginatedData = transactionData.slice(skip, endIndex);

    let allData = JSON.parse(JSON.stringify(paginatedData));

    allData.forEach((data) => {
      console.log("data",data);
      if (data.transactionType === 'credit') {
        balances += data.amount;
        data.balance = balances || 0;
      } else if (data.transactionType === 'debit') {
        debitBalances += data.amount;
        data.debitBalance = debitBalances || 0;
      } else if (data.transactionType === 'withdrawal') {
        withdrawalBalances += data.withdraw;
        data.withdrawalBalance = withdrawalBalances || 0;
      }
    });
    console.log("all", allData);
    const paginationData = apiResponsePagination(page, totalPages, totalItems);
    return res.status(statusCode.success).send(apiResponseSuccess(allData, true, statusCode.success, messages.success, paginationData));
  } catch (error) {
    res
      .status(statusCode.internalServerError)
      .send(apiResponseErr(error.data ?? null, false, error.responseCode ?? statusCode.internalServerError, error.errMessage ?? error.message));
  }
};

export const accountStatement = async (req, res) => {
  try {
    const adminId = req.params.adminId;
    const ITEMS_PER_PAGE = 5;
    const page = parseInt(req.query.page) || 1;

    const admin = await admins.findOne({ where: { adminId } });

    if (!admin) {
      return res.status(statusCode.notFound).json(apiResponseErr(null, statusCode.notFound, false, messages.adminNotFound));
    }

    const transferAmount = await transaction.findAll({ where: { adminId } });
    const selfTransaction = await selfTransactions.findAll({ where: { adminId } });

    const mergedData = transferAmount.concat(selfTransaction);
    const totalCount = mergedData.length;
    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

    const paginatedData = mergedData.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

    const paginationData = apiResponsePagination(page, totalPages, totalCount);
    return res.status(statusCode.success).send(apiResponseSuccess(paginatedData, true, statusCode.success, messages.success, paginationData));
  } catch (error) {
    res
      .status(statusCode.internalServerError)
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
