import { apiResponseErr, apiResponseSuccess, apiResponsePagination } from '../helper/errorHandler.js';
import selfTransactions from '../models/selfTransaction.model.js';
import transaction from '../models/transactions.model.js';
import admins from '../models/admin.model.js';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';

export const depositTransaction = async (req, res) => {
  try {
    const { amount } = req.body;
    const adminId = req.params.adminId;
    const admin = await admins.findOne({ where: { adminId } });

    if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
      return res.status(400).json(apiResponseErr(null, 400, false, 'Invalid amount'));
    }

    if (!admin) {
      return res.status(400).json(apiResponseErr(null, 400, false, 'Admin not found'));
    }

    const depositAmount = Math.round(parseFloat(amount));
    const depositTransactionData = {
      amount: depositAmount,
      userName: admin.userName,
      date: new Date(),
      transactionType: 'deposit',
    };

    // Update balances correctly
    const newDepositBalance = admin.depositBalance + depositAmount;
    const newAdminBalance = admin.balance + depositAmount;

    // First Update the balance in Admin Table
    await admin.update({
      balance: newAdminBalance,
      depositBalance: newDepositBalance,
    });

    // Now Create the transaction record in selfTransaction Table
    await selfTransactions.create({
      selfTransactionId: uuidv4(),
      adminId: adminId,
      amount: depositTransactionData.amount,
      userName: depositTransactionData.userName,
      date: depositTransactionData.date,
      transactionType: depositTransactionData.transactionType,
    });

    return res.status(201).json(apiResponseSuccess(null, 201, true, 'Balance Deposit Successfully'));
  } catch (error) {
    res
      .status(500)
      .send(apiResponseErr(error.data ?? null, false, error.responseCode ?? 500, error.errMessage ?? error.message));
  }
};

export const transferAmount = async (req, res) => {
  try {
    const { receiveUserId, transferAmount, withdrawalAmt, remarks, password } = req.body;
    const adminId = req.params.adminId;
    const senderAdmin = await admins.findOne({ where: { adminId } })
    
    if (isNaN(transferAmount) || isNaN(withdrawalAmt)) {
      return res.status(400).json(apiResponseErr(null, 400, false, 'Invalid Amount'));
    }

    if (!senderAdmin) {
      return res.status(401).json(apiResponseErr(null, 400, false, 'Admin not found'));
    }

    const isPasswordValid = await bcrypt.compare(password, senderAdmin.password);
    if (!isPasswordValid) {
      return res.status(401).json(apiResponseErr(null, 400, false, 'Invalid password for the transaction'));
    }
    const receiverAdmin = await admins.findOne({ where: { adminId: receiveUserId } });
    if (!receiverAdmin) {
      return res.status(401).json(apiResponseErr(null, 400, false, 'Receiver Admin not found'));
    }
    if (!senderAdmin.isActive) {
      return res.status(401).json(apiResponseErr(null, 400, false, 'Sender Admin is inactive'));
    }

    if (!receiverAdmin.isActive) {
      return res.status(401).json(apiResponseErr(null, 400, false, 'Receiver Admin is inactive'));
    }
    if (withdrawalAmt && withdrawalAmt > 0) {
      
      if (receiverAdmin.balance < withdrawalAmt) {
        return res.status(401).json(apiResponseErr(null, 400, false, 'Insufficient Balance For Withdrawal'));
      }
      const withdrawalRecord = {
        transactionType: 'withdrawal',
        amount: Math.round(parseFloat(withdrawalAmt)),
        transferFromUserAccount: receiverAdmin.userName,
        transferToUserAccount: senderAdmin.userName,
        userName: senderAdmin.userName,
        date: new Date(),
        remarks: remarks,
      };
      // Calculation
      const deductionBalance = (receiverAdmin.balance -= Math.round(parseFloat(withdrawalAmt)));
      const deductionLoadBalance = (receiverAdmin.loadBalance -= Math.round(parseFloat(withdrawalAmt)));
      const creditAmount = (senderAdmin.balance += Math.round(parseFloat(withdrawalAmt)));

      // Updating in Table
      await receiverAdmin.update({
        balance: deductionBalance,
        loadBalance: deductionLoadBalance,
      });

      await senderAdmin.update({
        balance: creditAmount,
      });

      // Now Creating the transaction record in Table
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
      return res.status(201).json(apiResponseSuccess(null, 201, true, 'Balance Deducted Successfully'));
    } else {
      if (senderAdmin.balance < transferAmount) {
        return res.status(401).json(apiResponseErr(null, 400, false, 'Insufficient Balance For Transfer'));
      }
      // console.log("senderAdmin", senderAdmin);

      const transferRecordDebit = {
        transactionType: 'debit',
        amount: Math.round(parseFloat(transferAmount)),
        transferFromUserAccount: senderAdmin.userName,
        transferToUserAccount: receiverAdmin.userName,
        userName: senderAdmin.userName,
        date: new Date(),
        remarks: remarks,
      };

      const transferRecordCredit = {
        transactionType: 'credit',
        amount: Math.round(parseFloat(transferAmount)),
        transferFromUserAccount: senderAdmin.userName,
        transferToUserAccount: receiverAdmin.userName,
        userName: senderAdmin.userName,
        date: new Date(),
        remarks: remarks,
      };

      const senderBalance = (senderAdmin.balance -= Math.round(parseFloat(transferAmount)));
      const receiverBalance = (receiverAdmin.balance += Math.round(parseFloat(transferAmount)));
      const receiverLoadBalance = (receiverAdmin.loadBalance += Math.round(parseFloat(transferAmount)));

      // Updating in Table
      await receiverAdmin.update({
        balance: receiverBalance,
        loadBalance: receiverLoadBalance,
      });

      await senderAdmin.update({
        balance: senderBalance,
      });

      // Now Creating the transaction record in Table
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
      return res.status(201).json(apiResponseSuccess(null, 201, true, 'Balance Debited Successfully'));
    }
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .send(apiResponseErr(error.data ?? null, false, error.responseCode ?? 500, error.errMessage ?? error.message));
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
      return res.status(400).json(apiResponseErr(null, 400, false, 'Admin not found'));
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
      if (data.transactionType === 'Credit') {
        balances += data.amount;
        data.balance = balances;
      } else if (data.transactionType === 'Debit') {
        debitBalances += data.amount;
        data.debitBalance = debitBalances;
      } else if (data.transactionType === 'Withdrawal') {
        withdrawalBalances += data.withdraw;
        data.withdrawalBalance = withdrawalBalances || 0;
      }
    });
    const paginationData = apiResponsePagination(page, totalPages, totalItems);
    return res.status(200).send(apiResponseSuccess(allData, true, 200, 'Success', paginationData));
  } catch (error) {
    res
      .status(500)
      .send(apiResponseErr(error.data ?? null, false, error.responseCode ?? 500, error.errMessage ?? error.message));
  }
};

export const accountStatement = async (req, res) => {
  try {
    const adminId = req.params.adminId;
    const ITEMS_PER_PAGE = 5;
    const page = parseInt(req.query.page) || 1;

    const admin = await admins.findOne({ where: { adminId } });

    if (!admin) {
      return res.status(404).json(apiResponseErr(null, 404, false, 'Admin not found'));
    }

    const transferAmount = await transaction.findAll({ where: { adminId } });
    const selfTransaction = await selfTransactions.findAll({ where: { adminId } });

    const mergedData = transferAmount.concat(selfTransaction);
    const totalCount = mergedData.length;
    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

    const paginatedData = mergedData.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

    const paginationData = apiResponsePagination(page, totalPages, totalCount);
    return res.status(200).send(apiResponseSuccess(paginatedData, true, 200, 'Success', paginationData));
  } catch (error) {
    res
      .status(500)
      .send(apiResponseErr(error.data ?? null, false, error.responseCode ?? 500, error.errMessage ?? error.message));
  }
};

export const viewBalance = async (req, res) => {
  try {
    const adminId = req.params.adminId;
    const admin = await admins.findOne({ where: { adminId } });
    const amount = {
      balance: admin.balance,
    };
    return res.status(200).json(apiResponseSuccess(amount, 200, true, 'Successfully'));
  } catch (error) {
    res
      .status(500)
      .send(apiResponseErr(error.data ?? null, false, error.responseCode ?? 500, error.errMessage ?? error.message));
  }
};
