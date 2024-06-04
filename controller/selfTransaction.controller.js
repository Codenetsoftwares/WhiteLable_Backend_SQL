import { apiResponseErr, apiResponseSuccess } from '../helper/errorHandler.js';
import { database } from '../dbConnection/database.service.js';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';

export const depositTransaction = async (req, res) => {
  try {
    const { amount } = req.body;
    const adminId = req.params.adminId;
    const [admin] = await database.execute('SELECT * FROM Admins WHERE adminId = ?', [adminId]);

    if (!admin.length) {
      return res.status(400).json(apiResponseErr(null, 400, false, 'Admin Not Found For Deposit'));
    }

    const depositAmount = Math.round(parseFloat(amount));
    const depositTransaction = {
      amount: depositAmount,
      userName: admin[0].userName,
      date: new Date(),
      transactionType: 'Deposit',
    };

    console.log('depositTransaction', depositTransaction);

    // Update balances correctly
    const newDepositBalance = admin[0].depositBalance + depositAmount;
    const newAdminBalance = admin[0].balance + depositAmount;

    console.log('newDepositBalance', newDepositBalance);
    console.log('newAdminBalance', newAdminBalance);

    // First Update the balance in Admin Table
    await database.execute('UPDATE Admins SET balance = ?, depositBalance = ? WHERE adminId = ?', [
      newAdminBalance,
      newDepositBalance,
      adminId,
    ]);

    // Now Create the transaction record in selfTransaction Table
    const selfTransactionId = uuidv4();
    await database.execute(
      'INSERT INTO SelfTransactions (selfTransactionId, adminId, amount, userName, date, transactionType) VALUES (?, ?, ?, ?, ?, ?)',
      [
        selfTransactionId,
        adminId,
        depositTransaction.amount,
        depositTransaction.userName,
        depositTransaction.date,
        depositTransaction.transactionType,
      ],
    );

    return res.status(201).json(apiResponseSuccess(depositTransaction, 201, true, 'Balance Deposit Successfully'));
  } catch (error) {
    res
      .status(500)
      .send(apiResponseErr(error.data ?? null, false, error.responseCode ?? 500, error.errMessage ?? error.message));
  }
};

export const transferAmount = async (req, res) => {
  try {
    const { receiveUserId, trnsferAmount, withdrawlAmt, remarks, password } = req.body;
    const adminId = req.params.adminId;
    const [senderAdmin] = await database.execute('SELECT * FROM Admins WHERE adminId = ?', [adminId]);

    if (!senderAdmin) {
      return res.status(401).json(apiResponseErr(null, 400, false, 'Admin not found'));
    }
    const isPasswordValid = await bcrypt.compare(password, senderAdmin[0].password);
    if (!isPasswordValid) {
      return res.status(401).json(apiResponseErr(null, 400, false, 'Invalid password for the transaction'));
    }
    const [receiverAdmin] = await database.execute('SELECT * FROM Admins WHERE adminId = ?', [receiveUserId]);
    if (!receiverAdmin) {
      return res.status(401).json(apiResponseErr(null, 400, false, 'Receiver Admin not found'));
    }
    if (!senderAdmin[0].isActive) {
      return res.status(401).json(apiResponseErr(null, 400, false, 'Sender Admin is inactive'));
    }

    if (!receiverAdmin[0].isActive) {
      return res.status(401).json(apiResponseErr(null, 400, false, 'Receiver Admin is inactive'));
    }
    if (withdrawlAmt && withdrawlAmt > 0) {
      if (receiverAdmin[0].balance < withdrawlAmt) {
        return res.status(401).json(apiResponseErr(null, 400, false, 'Insufficient Balance For Withdrawal'));
      }
      const withdrawalRecord = {
        transactionType: 'Withdrawal',
        amount: Math.round(parseFloat(withdrawlAmt)),
        transferFromUserAccount: receiverAdmin[0].userName,
        transferToUserAccount: senderAdmin[0].userName,
        date: new Date(),
        remarks: remarks,
      };
      // Calculation
      const deductionBalance = (receiverAdmin[0].balance -= Math.round(parseFloat(withdrawlAmt)));
      const deductionLoadBalance = (receiverAdmin[0].loadBalance -= Math.round(parseFloat(withdrawlAmt)));
      const creditAmount = (senderAdmin[0].balance += Math.round(parseFloat(withdrawlAmt)));
      // Updation in Table
      await database.execute('UPDATE Admins SET balance = ?, loadBalance = ? WHERE adminId = ?', [
        deductionBalance,
        deductionLoadBalance,
        receiveUserId,
      ]);
      await database.execute('UPDATE Admins SET balance = ? WHERE adminId = ?', [
        creditAmount,
        adminId,
      ]);
      // Now Creating the transaction record in Table
      const transactionId = uuidv4();
      const [crateTransaction] = await database.execute(
        'INSERT INTO Transactions (transactionId, adminId, amount, userName, date, transactionType, remarks, transferFromUserAccount, transferToUserAccount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          transactionId,
          adminId,
          withdrawalRecord.amount || null,
          withdrawalRecord.userName || null,
          withdrawalRecord.date || null,
          withdrawalRecord.transactionType || null,
          withdrawalRecord.remarks || null,
          withdrawalRecord.transferFromUserAccount || null,
          withdrawalRecord.transferToUserAccount || null,
        ],
      );
      return res.status(201).json(apiResponseSuccess(true, 201, true, 'Balance Deducted Successfully'));
    } else {
      if (senderAdmin[0].balance < trnsferAmount) {
        return res.status(401).json(apiResponseErr(null, 400, false, 'Insufficient Balance For Transfer'));
      }
      // console.log("senderAdmin", senderAdmin);

      const transferRecordDebit = {
        transactionType: 'Debit',
        amount: Math.round(parseFloat(trnsferAmount)),
        transferFromUserAccount: senderAdmin[0].userName,
        transferToUserAccount: receiverAdmin[0].userName,
        date: new Date(),
        remarks: remarks,
      };

      const transferRecordCredit = {
        transactionType: 'Credit',
        amount: Math.round(parseFloat(trnsferAmount)),
        transferFromUserAccount: senderAdmin[0].userName,
        transferToUserAccount: receiverAdmin[0].userName,
        date: new Date(),
        remarks: remarks,
      };

      const senderBalance = (senderAdmin[0].balance -= Math.round(parseFloat(trnsferAmount)));
      const receiverBalance = (receiverAdmin[0].balance += Math.round(parseFloat(trnsferAmount)));
      const receiverLoadBalance = (receiverAdmin[0].loadBalance += Math.round(parseFloat(trnsferAmount)));

      // Updation in Table
      await database.execute('UPDATE Admins SET balance = ?, loadBalance = ? WHERE adminId = ?', [
        receiverBalance,
        receiverLoadBalance,
        receiverAdmin[0].adminId,
      ]);

      await database.execute('UPDATE Admins SET balance = ?  WHERE adminId = ?', [
        senderBalance,
        senderAdmin[0].adminId,
      ]);

      // Now Creating the transaction record in Table
      const debitTransactionId = uuidv4();
      const [DebitTransaction] = await database.execute(
        'INSERT INTO Transactions (transactionId, adminId, amount, userName, date, transactionType, remarks, transferFromUserAccount, transferToUserAccount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          debitTransactionId,
          adminId,
          transferRecordDebit.amount || null,
          transferRecordDebit.transferFromUserAccount || null,
          transferRecordDebit.date || null,
          transferRecordDebit.transactionType || null,
          transferRecordDebit.remarks || null,
          transferRecordDebit.transferFromUserAccount || null,
          transferRecordDebit.transferToUserAccount || null,
        ],
      );

      // return res.status(201).json(apiResponseSuccess(DebitTransaction, 201, true, 'Balance Debited Successfully'));
      const creditTransactionId = uuidv4();
      const [CreditTransaction] = await database.execute(
        'INSERT INTO Transactions (transactionId, adminId, amount, userName, date, transactionType, remarks, transferFromUserAccount, transferToUserAccount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          creditTransactionId,
          adminId,
          transferRecordCredit.amount || null,
          transferRecordCredit.transferFromUserAccount || null,
          transferRecordCredit.date || null,
          transferRecordCredit.transactionType || null,
          transferRecordCredit.remarks || null,
          transferRecordCredit.transferFromUserAccount || null,
          transferRecordCredit.transferToUserAccount || null,
        ],
      );
      console.log('CreditTransaction', CreditTransaction);
      return res.status(201).json(apiResponseSuccess(true, 201, true, 'Balance Debited Successfully'));
    }
  } catch (error) {
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

    const [admin] = await database.execute('SELECT * FROM Admins WHERE userName = ?', [userName]);
    if (!admin) {
      return res.status(400).json(apiResponseErr(null, 400, false, 'Admin not found'));
    }

    const adminId = admin[0].adminId;

    let transactionQuery = `SELECT * FROM Transactions WHERE adminId = ?`;
    const transactionValues = [adminId];

    if (startDate) {
      transactionQuery += ' AND date >= ?';
      transactionValues.push(startDate);
    }

    transactionQuery += ' ORDER BY date DESC';

    const [transactionData] = await database.execute(transactionQuery, transactionValues);

    const totalItems = transactionData.length;
    const totalPages = Math.ceil(totalItems / pageSize);

    const skip = (page - 1) * pageSize;
    const endIndex = page * pageSize;

    const paginatedData = transactionData.slice(skip, endIndex);

    let allData = JSON.parse(JSON.stringify(paginatedData));
    console.log('allData', allData);
    allData.map((data) => {
      if (data.transactionType === 'Credit') {
        balances += data.amount;
        data.balance = balances;
      } else if (data.transactionType === 'Debit') {
        debitBalances += data.amount;
        data.debitBalance = debitBalances;
      } else if (data.transactionType === 'Withdrawal') {
        withdrawalBalances += data.withdraw;
        data.withdrawalBalance = withdrawalBalances;
      }
    });

    return res
      .status(200)
      .json(apiResponseSuccess(allData, totalPages, totalItems, 200, true, 'Transactions fetched successfully'));
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

    const [adminRows] = await database.execute('SELECT * FROM Admins WHERE adminId = ?', [adminId]);
    const admin = adminRows[0];
    if (!admin) {
      return res.status(404).json(apiResponseErr(null, 404, false, 'Admin not found'));
    }

    const [transferAmount] = await database.execute('SELECT * FROM Transactions WHERE adminId = ?', [admin.adminId]);
    const [selfTransaction] = await database.execute('SELECT * FROM SelfTransactions WHERE adminId = ?', [
      admin.adminId,
    ]);

    const mergedData = transferAmount.concat(selfTransaction);
    const totalCount = mergedData.length;
    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

    const paginatedData = mergedData.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

    return res.status(200).json(
      apiResponseSuccess(
        {
          data: paginatedData,
          currentPage: page,
          totalPages: totalPages,
          totalCount: totalCount,
        },
        200,
        true,
        'successfully',
      ),
    );
  } catch (error) {
    res
      .status(500)
      .send(apiResponseErr(error.data ?? null, false, error.responseCode ?? 500, error.errMessage ?? error.message));
  }
};

export const viewBalance = async (req, res) => {
  try {
    const adminId = req.params.adminId;
    const [admin] = await database.execute('SELECT * FROM Admins WHERE adminId = ?', [adminId]);
    if (!admin) {
      const [subAdmin] = await database.execute('SELECT * FROM Admins WHERE adminId = ?', [adminId]);
      if (!subAdmin) {
        return res.status(400).json(apiResponseErr(null, 404, false, 'Admin Not Found'));
      }
      const amount = {
        balance: subAdmin[0].balance,
      };
      return res.status(201).json(apiResponseSuccess({ amount }, 200, true, 'successfully'));
    }
    const amount = {
      balance: admin[0].balance,
    };
    return res.status(200).json(apiResponseSuccess(amount, 200, true, 'Successfully'));
  } catch (error) {
    res
      .status(500)
      .send(apiResponseErr(error.data ?? null, false, error.responseCode ?? 500, error.errMessage ?? error.message));
  }
};