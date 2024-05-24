import { apiResponseErr, apiResponseSuccess } from '../helper/errorHandler.js';
import { database } from '../dbConnection/database.service.js';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const globalUsernames = [];

export const createAdmin = async (req, res) => {
  try {
    const user = req.user;
    const { userName, password, roles } = req.body;
    const [existingAdmin] = await database.execute('SELECT * FROM Admins WHERE userName = ?', [userName]);
    if (existingAdmin.length > 0) {
      return res.status(400).json(apiResponseErr(null, 400, false, 'Admin already exists'));
    }
    const passwordSalt = await bcrypt.genSalt();
    const encryptedPassword = await bcrypt.hash(password, passwordSalt);
    const defaultPermission = ['All-Access'];
    const adminId = uuidv4();
    const rolesWithDefaultPermission = Array.isArray(roles)
      ? roles.map((role) => ({ role, permission: defaultPermission }))
      : [{ role: roles, permission: defaultPermission }];
    const createdByUser = user.userName;
    const createdById = user.adminId;
    const [result] = await database.execute(
      'INSERT INTO Admins (adminId, userName, password, roles, createdById, createdByUser) VALUES (?, ?, ?, ?, ?, ?)',
      [adminId, userName, encryptedPassword, JSON.stringify(rolesWithDefaultPermission), createdById, createdByUser],
    );
    return res.status(201).json(apiResponseSuccess(true, 201, true, 'Admin created successfully'));
  } catch (error) {
    res
      .status(500)
      .send(apiResponseErr(error.data ?? null, false, error.responseCode ?? 500, error.errMessage ?? error.message));
  }
};

export const createSubAdmin = async (req, res) => {
  try {
    const { userName, password, roles } = req.body;
    const user = req.user;
    if (user.isActive === false) {
      return res.status(400).json(apiResponseErr(null, 400, false, 'Account is in Inactive Mode'));
    }
    const [existingAdmin] = await database.execute('SELECT * FROM Admins WHERE userName = ?', [userName]);
    if (existingAdmin.length > 0) {
      return res.status(400).json(apiResponseErr(null, 400, false, 'Admin already exists'));
    }
    const passwordSalt = await bcrypt.genSalt();
    const encryptedPassword = await bcrypt.hash(password, passwordSalt);
    let subRole = '';
    for (let i = 0; i < user.roles.length; i++) {
      if (user.roles[i].role.includes('superAdmin')) {
        subRole = 'SubAdmin';
      } else if (user.roles[i].role.includes('WhiteLabel')) {
        subRole = 'SubWhiteLabel';
      } else if (user.roles[i].role.includes('HyperAgent')) {
        subRole = 'SubHyperAgent';
      } else if (user.roles[i].role.includes('SuperAgent')) {
        subRole = 'SubSuperAgent';
      } else if (user.roles[i].role.includes('MasterAgent')) {
        subRole = 'SubMasterAgent';
      } else {
        throw { code: 400, message: 'Invalid user role for creating sub-admin' };
      }
    }
    const adminId = uuidv4();
    const createdByUser = user.userName;
    const createdById = user.adminId;
    const [result] = await database.execute(
      'INSERT INTO Admins (adminId, userName, password, roles, createdById, createdByUser) VALUES (?, ?, ?, ?, ?, ?)',
      [
        adminId,
        userName,
        encryptedPassword,
        JSON.stringify([{ role: subRole, permission: roles[0].permission }]),
        createdById,
        createdByUser,
      ],
    );
    return res.status(201).json(apiResponseSuccess(true, 201, true, 'Sub Admin created successfully'));
  } catch (error) {
    res
      .status(500)
      .send(apiResponseErr(error.data ?? null, false, error.responseCode ?? 500, error.errMessage ?? error.message));
  }
};

export const generateAdminAccessToken = async (req, res) => {
  try {
    const { userName, password, persist } = req.body;
    const [existingAdmin] = await database.execute('SELECT * FROM Admins WHERE userName = ?', [userName]);
    if (!existingAdmin) {
      const subAdminUser = await database.execute('SELECT * FROM SubAdmin userName = ?', [userName]);
      if (!subAdminUser) {
        return res.status(400).json(apiResponseErr(null, 400, false, 'Invalid User Name or password'));
      }
      if (subAdminUser.locked === false) {
        return res.status(400).json(apiResponseErr(null, 400, false, `${subAdminUser[0].userName} Account is Locked`));
      }
      const passwordValid = await bcrypt.compare(password, subAdminUser.password);
      if (!passwordValid) {
        return res.status(400).json(apiResponseErr(null, 400, false, 'Invalid password'));
      }
      const accessTokenResponse = {
        subAdminId: subAdminUser[0].subAdminId,
        createdById: subAdminUser[0].createdById,
        createdByUser: subAdminUser[0].createdByUser,
        userName: subAdminUser[0].userName,
        roles: subAdminUser[0].roles.map((role) => ({
          role: role.role,
          permission: role.permission,
        })),
        Status: subAdminUser[0].isActive
          ? 'Active'
          : !subAdminUser[0].locked
            ? 'Locked'
            : !subAdminUser[0].isActive
              ? 'Suspended'
              : '',
      };
      const accessToken = jwt.sign(accessTokenResponse, process.env.JWT_SECRET_KEY, {
        expiresIn: persist ? '1y' : '8h',
      });
      const loginTime = new Date();
      await database.execute('UPDATE Admins SET lastLoginTime = ? WHERE userName = ?', [loginTime, userName]);
      return res
        .status(200)
        .send(
          apiResponseSuccess(
            { Token: accessToken, SubAdminData: accessTokenResponse },
            true,
            200,
            'Sub Admin login successfully',
          ),
        );
    } else {
      if (!existingAdmin) {
        return res.status(400).json(apiResponseErr(null, 400, false, 'Invalid User Name or password'));
      }
      if (existingAdmin.locked === false) {
        return res.status(400).json(apiResponseErr(null, 400, false, `${existingAdmin[0].userName} Account is Locked`));
      }
      const passwordValid = await bcrypt.compare(password, existingAdmin[0].password);
      if (!passwordValid) {
        return res.status(400).json(apiResponseErr(null, 400, false, 'Invalid password'));
      }
      const accessTokenResponse = {
        adminId: existingAdmin[0].adminId,
        createdById: existingAdmin[0].createdById,
        createdByUser: existingAdmin[0].createdByUser,
        userName: existingAdmin[0].userName,
        roles: existingAdmin[0].roles.map((role) => ({
          role: role.role,
          permission: role.permission,
        })),
        Status: existingAdmin[0].isActive
          ? 'Active'
          : !existingAdmin[0].locked
            ? 'Locked'
            : !existingAdmin[0].isActive
              ? 'Suspended'
              : '',
      };
      const accessToken = jwt.sign(accessTokenResponse, process.env.JWT_SECRET_KEY, {
        expiresIn: persist ? '1y' : '8h',
      });
      const loginTime = new Date();
      await database.execute('UPDATE Admins SET lastLoginTime = ? WHERE userName = ?', [loginTime, userName]);
      return res
        .status(200)
        .send(
          apiResponseSuccess(
            { Token: accessToken, AdminData: accessTokenResponse },
            true,
            200,
            'Admin login successfully',
          ),
        );
    }
  } catch (error) {
    res
      .status(500)
      .send(apiResponseErr(error.data ?? null, false, error.responseCode ?? 500, error.errMessage ?? error.message));
  }
};

export const getIpDetail = async (req, res) => {
  try {
    const userName = req.params.userName;
    console.log('userName', userName);
    let [admin] = await database.execute('SELECT * FROM Admins WHERE userName = ?', [userName]);
    if (!admin) {
      return res.status(400).json(apiResponseErr(null, 400, false, 'Admin not found'));
    }
    const loginTime = admin[0].lastLoginTime;
    console.log('loginTime', loginTime);
    let clientIP = req.ip;
    const forwardedFor = req.headers['x-forwarded-for'];
    if (forwardedFor) {
      const forwardedIps = forwardedFor.split(',');
      clientIP = forwardedIps[0].trim();
    }
    const data = await fetch(`http://ip-api.com/json/${clientIP}`);
    const collect = await data.json();
    await database.execute('UPDATE Admins SET lastLoginTime = ? WHERE userName = ?', [loginTime, userName]);
    const responseObj = {
      userName: admin[0].userName,
      ip: {
        IP: clientIP,
        country: collect.country,
        region: collect.regionName,
        timezone: collect.timezone,
      },
      isActive: admin[0].isActive,
      locked: admin[0].locked,
      lastLoginTime: loginTime,
    };

    return res.status(200).json(apiResponseSuccess(responseObj, 200, true, 'Data Fetched'));
  } catch (error) {
    res
      .status(500)
      .send(apiResponseErr(error.data ?? null, false, error.responseCode ?? 500, error.errMessage ?? error.message));
  }
};

export const AdminPasswordResetCode = async (req, res) => {
  try {
    const { userName, oldPassword, password } = req.body;
    const [existingUser] = await database.execute('SELECT * FROM Admins WHERE userName = ?', [userName]);
    if (existingUser.isActive === false || existingUser.locked === false) {
      return res.status(400).json(apiResponseErr(null, 400, false, 'Account is Not Active'));
    }
    if (!existingUser) {
      return res.status(400).json(apiResponseErr(null, 400, false, 'Admin not found'));
    }
    const oldPasswordIsCorrect = await bcrypt.compare(oldPassword, existingUser[0].password);
    if (!oldPasswordIsCorrect) {
      return res.status(400).json(apiResponseErr(null, 401, false, 'Invalid old password'));
    }
    const passwordIsDuplicate = await bcrypt.compare(password, existingUser[0].password);
    if (passwordIsDuplicate) {
      return res
        .status(400)
        .json(apiResponseErr(null, 409, false, 'New Password Cannot Be The Same As Existing Password'));
    }
    const passwordSalt = await bcrypt.genSalt();
    const encryptedPassword = await bcrypt.hash(password, passwordSalt);
    await database.execute('UPDATE Admins SET password = ? WHERE userName = ?', [encryptedPassword, userName]);
    return res.status(201).json(apiResponseSuccess(null, 201, true, 'Password Reset Successful!'));
  } catch (error) {
    res
      .status(500)
      .send(apiResponseErr(error.data ?? null, false, error.responseCode ?? 500, error.errMessage ?? error.message));
  }
};

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
        receiverAdmin[0].adminId,
      ]);
      await database.execute('UPDATE Admins SET balance = ?, WHERE adminId = ?', [
        creditAmount,
        senderAdmin[0].adminId,
      ]);
      // Now Creating the transaction record in Table
      const transactionId = uuidv4();
      const [crateTransaction] = await database.execute(
        'INSERT INTO Transactions (transactionId, adminId, amount, userName, date, transactionType, remarks, transferFromUserAccount, transferToUserAccount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          transactionId,
          adminId,
          withdrawalRecord.amount,
          withdrawalRecord.userName,
          withdrawalRecord.date,
          withdrawalRecord.transactionType,
          withdrawalRecord.remarks,
          withdrawalRecord.transferFromUserAccount,
          withdrawalRecord.transferToUserAccount,
        ],
      );
      return res.status(201).json(apiResponseSuccess(crateTransaction, 201, true, 'Balance Deducted Successfully'));
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
          transferRecordDebit.amount,
          transferRecordDebit.transferFromUserAccount,
          transferRecordDebit.date,
          transferRecordDebit.transactionType,
          transferRecordDebit.remarks,
          transferRecordDebit.transferFromUserAccount,
          transferRecordDebit.transferToUserAccount,
        ],
      );

      // return res.status(201).json(apiResponseSuccess(DebitTransaction, 201, true, 'Balance Debited Successfully'));
      const creditTransactionId = uuidv4();
      const [CreditTransaction] = await database.execute(
        'INSERT INTO Transactions (transactionId, adminId, amount, userName, date, transactionType, remarks, transferFromUserAccount, transferToUserAccount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          creditTransactionId,
          adminId,
          transferRecordCredit.amount,
          transferRecordCredit.transferFromUserAccount,
          transferRecordCredit.date,
          transferRecordCredit.transactionType,
          transferRecordCredit.remarks,
          transferRecordCredit.transferFromUserAccount,
          transferRecordCredit.transferToUserAccount,
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

export const viewAllCreates = async (req, res) => {
  try {
    const createdById = req.params.createdById;
    const page = parseInt(req.query.page, 10) || 1;
    const pageSize = parseInt(req.query.pageSize, 10) || 5;

    const searchQuery = req.query.userName ? ` AND userName LIKE ?` : '';
    const searchParams = req.query.userName ? [`%${req.query.userName}%`] : [];

    const allowedRoles = ['WhiteLabel', 'HyperAgent', 'SuperAgent', 'MasterAgent'];
    const rolesQuery = allowedRoles.map(() => `JSON_CONTAINS(roles, JSON_OBJECT('role', ?), '$')`).join(' OR ');
    const rolesParams = allowedRoles;

    const totalRecordsParams = [createdById, ...rolesParams, ...searchParams];
    const totalRecordsQuery = `
      SELECT COUNT(*) as totalRecords
      FROM Admins
      WHERE createdById = ? AND (${rolesQuery})${searchQuery}
    `;
    console.log('totalRecordsQuery:', totalRecordsQuery);
    console.log('totalRecordsParams:', totalRecordsParams);
    const [totalRecordsResult] = await database.execute(totalRecordsQuery, totalRecordsParams);
    const totalRecords = totalRecordsResult[0].totalRecords;

    // Data query without pagination
    const dataParams = [createdById, ...rolesParams, ...searchParams];
    const dataQuery = `
      SELECT *
      FROM Admins
      WHERE createdById = ? AND (${rolesQuery})${searchQuery}
    `;
    console.log('dataQuery:', dataQuery);
    console.log('dataParams (without pagination):', dataParams);
    const [admins] = await database.execute(dataQuery, dataParams);

    if (!admins || admins.length === 0) {
      return res.status(404).json(apiResponseErr(null, 404, false, 'No records found'));
    }

    const offset = (page - 1) * pageSize;
    const paginatedAdmins = admins.slice(offset, offset + pageSize);

    const users = paginatedAdmins.map((admin) => ({
      adminId: admin.adminId,
      userName: admin.userName,
      roles: admin.roles,
      balance: admin.balance,
      loadBalance: admin.loadBalance,
      CreditRefs: admin.CreditRefs || [],
      createdById: admin.createdById,
      createdByUser: admin.createdByUser,
      Partnerships: admin.Partnerships || [],
      Status: admin.isActive ? 'Active' : !admin.locked ? 'Locked' : !admin.isActive ? 'Suspended' : '',
    }));

    const totalPages = Math.ceil(totalRecords / pageSize);

    return res.status(200).json(
      apiResponseSuccess(
        {
          users,
          totalRecords,
          totalPages,
          currentPage: page,
          pageSize,
        },
        200,
        true,
        'Successfully',
      ),
    );
  } catch (error) {
    console.error('Error:', error);
    res
      .status(500)
      .send(apiResponseErr(error.data ?? null, false, error.responseCode ?? 500, error.errMessage ?? error.message));
  }
};

export const viewAllSubAdminCreates = async (req, res) => {
  try {
    const createdById = req.params.createdById;
    const page = parseInt(req.query.page, 10) || 1;
    const pageSize = parseInt(req.query.pageSize, 10) || 5;

    const searchQuery = req.query.userName ? ' AND userName LIKE ?' : '';
    const searchParams = req.query.userName ? [`%${req.query.userName}%`] : [];

    const allowedRoles = ['SubAdmin', 'SubWhiteLabel', 'SubHyperAgent', 'SubSuperAgent', 'SubMasterAgent'];
    const rolesQuery = allowedRoles.map(() => `JSON_CONTAINS(roles, JSON_OBJECT('role', ?), '$')`).join(' OR ');
    const rolesParams = allowedRoles;

    const totalRecordsParams = [createdById, ...rolesParams, ...searchParams];
    const totalRecordsQuery = `
      SELECT COUNT(*) as totalRecords
      FROM Admins
      WHERE createdById = ? AND (${rolesQuery})${searchQuery}
    `;

    const [totalRecordsResult] = await database.execute(totalRecordsQuery, totalRecordsParams);
    const totalRecords = totalRecordsResult[0].totalRecords;

    const dataParams = [createdById, ...rolesParams, ...searchParams];
    const dataQuery = `
      SELECT *
      FROM Admins
      WHERE createdById = ? AND (${rolesQuery})${searchQuery}
    `;

    const [admins] = await database.execute(dataQuery, dataParams);

    if (!admins || admins.length === 0) {
      return res.status(404).json(apiResponseErr(null, 404, false, 'No records found'));
    }

    const offset = (page - 1) * pageSize;
    const paginatedAdmins = admins.slice(offset, offset + pageSize);

    const users = paginatedAdmins.map((admin) => ({
      adminId: admin.adminId,
      userName: admin.userName,
      roles: admin.roles,
      balance: admin.balance,
      loadBalance: admin.loadBalance,
      CreditRefs: admin.CreditRefs || [],
      createdById: admin.createdById,
      createdByUser: admin.createdByUser,
      Partnerships: admin.Partnerships || [],
      Status: admin.isActive ? 'Active' : !admin.locked ? 'Locked' : !admin.isActive ? 'Suspended' : '',
    }));

    const totalPages = Math.ceil(totalRecords / pageSize);

    return res.status(200).json(
      apiResponseSuccess(
        {
          users,
          totalRecords,
          totalPages,
          currentPage: page,
          pageSize,
        },
        200,
        true,
        'Successfully',
      ),
    );
  } catch (error) {
    console.error('Error:', error);
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

export const editCreditRef = async (req, res) => {
  try {
    const adminId = req.params.adminId;
    const { creditRef, password } = req.body;

    // Retrieve the admin
    const [adminResult] = await database.execute('SELECT * FROM Admins WHERE adminId = ?', [adminId]);
    const admin = adminResult[0];
    if (!admin) {
      return res.status(404).json(apiResponseErr(null, 404, false, 'Admin Not Found'));
    }

    // Validate the password
    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      return res.status(401).json(apiResponseErr(null, 401, false, 'Invalid password'));
    }

    // Check if the admin is active and not locked
    if (!admin.isActive || !admin.locked) {
      return res.status(404).json(apiResponseErr(null, 404, false, 'Admin is Suspended or Locked'));
    }

    // Create a new credit reference entry
    const newCreditRefEntry = {
      value: creditRef,
      date: new Date(),
    };

    // Retrieve existing credit references
    const [creditRefResult] = await database.execute('SELECT CreditRefs FROM Admins WHERE adminId = ?', [adminId]);
    let creditRefList;

    try {
      creditRefList = JSON.parse(creditRefResult[0].CreditRefs) || [];
    } catch (e) {
      creditRefList = [];
    }

    // Update the credit reference list
    creditRefList.push(newCreditRefEntry);

    if (creditRefList.length > 10) {
      creditRefList.shift();
    }

    // Update the credit reference field in the database
    const [updateResult] = await database.execute('UPDATE Admins SET CreditRefs = ? WHERE adminId = ?', [
      JSON.stringify(creditRefList),
      adminId,
    ]);

    if (updateResult.affectedRows === 0) {
      throw { code: 500, message: 'Cannot Update Admin CreditRef' };
    }

    return res
      .status(201)
      .json(apiResponseSuccess({ ...admin, creditRef: creditRefList }, 201, true, 'CreditRef Edited successfully'));
  } catch (error) {
    res
      .status(500)
      .send(apiResponseErr(error.data ?? null, false, error.responseCode ?? 500, error.errMessage ?? error.message));
  }
};

export const moveAdminToTrash = async (req, res) => {
  try {
    const { requestId } = req.body;

    // Fetch the admin to be moved to trash
    const [adminResult] = await database.execute('SELECT * FROM Admins WHERE adminId = ?', [requestId]);

    if (!adminResult || adminResult.length === 0) {
      return res.status(404).json(apiResponseErr(null, 404, false, `Admin User not found with id: ${requestId}`));
    }

    const admin = adminResult[0];

    if (admin.balance !== 0) {
      return res
        .status(400)
        .json(apiResponseErr(null, 400, false, `Balance should be 0 to move the Admin User to Trash`));
    }

    if (!admin.isActive) {
      return res.status(400).json(apiResponseErr(null, 400, false, `Admin is inactive or locked`));
    }

    const updatedTransactionData = {
      adminId: admin.adminId,
      roles: admin.roles ? JSON.stringify(admin.roles) : null,
      userName: admin.userName,
      password: admin.password,
      balance: admin.balance,
      loadBalance: admin.loadBalance,
      CreditRefs: admin.CreditRefs ? JSON.stringify(admin.CreditRefs) : null,
      Partnerships: admin.Partnerships ? JSON.stringify(admin.Partnerships) : null,
      createById: admin.createById,
    };

    const trashId = uuidv4();

    // Insert into Trash table
    const [backupResult] = await database.execute(
      `INSERT INTO Trash (trashId, roles, userName, password, balance, loadBalance, CreditRefs, Partnerships, createById, adminId) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        trashId,
        updatedTransactionData.roles || null,
        updatedTransactionData.userName || null,
        updatedTransactionData.password || null,
        updatedTransactionData.balance || null,
        updatedTransactionData.loadBalance || null,
        updatedTransactionData.CreditRefs || null,
        updatedTransactionData.Partnerships || null,
        updatedTransactionData.createById || null,
        updatedTransactionData.adminId || null,
      ],
    );

    if (backupResult.affectedRows === 0) {
      return res.status(500).json(apiResponseErr(null, 500, false, `Failed to backup Admin User`));
    }

    // Delete the admin user from the Admins table
    const [deleteResult] = await database.execute('DELETE FROM Admins WHERE adminId = ?', [requestId]);

    if (deleteResult.affectedRows === 0) {
      return res
        .status(500)
        .json(apiResponseErr(null, 500, false, `Failed to delete Admin User with id: ${requestId}`));
    }

    return res.status(201).json(apiResponseSuccess(true, 201, true, 'Admin User moved to Trash'));
  } catch (error) {
    console.error('Error in moveAdminToTrash:', error);
    res
      .status(500)
      .send(apiResponseErr(error.data ?? null, false, error.responseCode ?? 500, error.errMessage ?? error.message));
  }
};

export const viewTrash = async (req, res) => {
  try {
    const [viewTrash] = await database.execute('SELECT * FROM Trash');
    return res.status(200).json(apiResponseSuccess(viewTrash, 200, true, 'successfully'));
  } catch (error) {
    res
      .status(500)
      .send(apiResponseErr(error.data ?? null, false, error.responseCode ?? 500, error.errMessage ?? error.message));
  }
};

export const deleteTrashData = async (req, res) => {
  try {
    const trashId = req.params.trashId;
    const [result] = await database.execute('DELETE FROM Trash WHERE trashId = ?', [trashId]);
    if (result.affectedRows === 1) {
      return res
        .status(201)
        .json(apiResponseSuccess('Data Deleted Successfully', 201, true, 'Data Deleted Successfully'));
    } else {
      return res.status(404).json(apiResponseErr('Data not found', false, 404, 'Data not found'));
    }
  } catch (error) {
    res
      .status(500)
      .send(apiResponseErr(error.data ?? null, false, error.responseCode ?? 500, error.errMessage ?? error.message));
  }
};

export const activeStatus = async (req, res) => {
  try {
    const adminId = req.params.adminId;
    const [activateStatus] = await database.execute('SELECT * FROM Admins WHERE adminId = ?', [adminId]);
    const active = {
      adminId: activateStatus[0].adminId,
      isActive: activateStatus[0].isActive,
      locked: activateStatus[0].locked,
      Status: activateStatus[0].isActive
        ? 'Active'
        : !activateStatus[0].locked
          ? 'Locked'
          : !activateStatus[0].isActive
            ? 'Suspended'
            : '',
    };
    return res.status(200).json(apiResponseSuccess(active, 200, true, 'successfully'));
  } catch (error) {
    res
      .status(500)
      .send(apiResponseErr(error.data ?? null, false, error.responseCode ?? 500, error.errMessage ?? error.message));
  }
};

export const restoreAdminUser = async (req, res) => {
  try {
    const { adminId } = req.body;
    const [existingAdminUser] = await database.execute('SELECT * FROM trash WHERE adminId = ?', [adminId]);

    if (existingAdminUser.length === 0) {
      return res.status(404).json(apiResponseErr(null, 404, false, 'Admin not found in trash'));
    }

    const restoreRemoveData = {
      roles: existingAdminUser[0].roles,
      userName: existingAdminUser[0].userName,
      password: existingAdminUser[0].password,
      balance: existingAdminUser[0].balance,
      loadBalance: existingAdminUser[0].loadBalance,
      CreditRefs: existingAdminUser[0].CreditRefs,
      Partnerships: existingAdminUser[0].Partnerships,
      createdById: existingAdminUser[0].createById,
      adminId: existingAdminUser[0].adminId,
    };

    const [restoreResult] = await database.execute(
      `INSERT INTO admins (adminId, userName, password, roles, balance, loadBalance, createdById, CreditRefs, Partnerships)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        restoreRemoveData.adminId,
        restoreRemoveData.userName,
        restoreRemoveData.password,
        JSON.stringify(restoreRemoveData.roles),
        restoreRemoveData.balance,
        restoreRemoveData.loadBalance,
        restoreRemoveData.createdById,
        JSON.stringify(restoreRemoveData.CreditRefs),
        JSON.stringify(restoreRemoveData.Partnerships),
      ],
    );

    if (restoreResult.affectedRows === 0) {
      return res.status(500).json(apiResponseErr(null, 500, false, 'Failed to restore Admin User'));
    }

    // Delete the user from the trash table
    const [deleteResult] = await database.execute('DELETE FROM trash WHERE adminId = ?', [adminId]);

    if (deleteResult.affectedRows === 0) {
      return res
        .status(500)
        .json(apiResponseErr(null, 500, false, `Failed to delete Admin User from Trash with adminId: ${adminId}`));
    }

    return res.status(201).json(apiResponseSuccess(true, 201, true, 'Admin restored from trash successfully!'));
  } catch (error) {
    res
      .status(500)
      .send(apiResponseErr(error.data ?? null, false, error.responseCode ?? 500, error.errMessage ?? error.message));
  }
};

export const profileView = async (req, res) => {
  try {
    const userName = req.params.userName;
    const [admin] = await database.execute('SELECT * FROM Admins WHERE userName = ?', [userName]);

    if (!admin) {
      return res.status(400).json(apiResponseErr(null, 400, false, 'Admin Not Found'));
    }

    const transferData = {
      adminId: admin[0].adminId,
      Roles: admin[0].roles,
      userName: admin[0].userName,
    };
    return res.status(200).json(apiResponseSuccess(transferData, 200, true, 'successfully'));
  } catch (error) {
    res
      .status(500)
      .send(apiResponseErr(error.data ?? null, false, error.responseCode ?? 500, error.errMessage ?? error.message));
  }
};
// done
export const editPartnership = async (req, res) => {
  try {
    const adminId = req.params.adminId;
    const { partnership, password } = req.body;

    const [adminResult] = await database.execute('SELECT * FROM Admins WHERE adminId = ?', [adminId]);
    const admin = adminResult[0];

    if (!admin) {
      return res.status(404).json(apiResponseErr(null, 404, false, 'Admin not found'));
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password);

    if (!isPasswordValid) {
      return res.status(401).json(apiResponseErr(null, 401, false, 'Invalid password'));
    }

    if (!admin.locked || !admin.isActive) {
      return res.status(403).json(apiResponseErr(null, 403, false, 'Admin is suspended or locked'));
    }

    const newPartnershipEntry = {
      value: partnership,
      date: new Date(),
    };

    const [partnershipResult] = await database.execute('SELECT Partnerships FROM Admins WHERE adminId = ?', [adminId]);

    let partnershipsList;
    try {
      if (typeof partnershipResult[0].Partnerships === 'string') {
        partnershipsList = JSON.parse(partnershipResult[0].Partnerships || '[]');
      } else {
        partnershipsList = partnershipResult[0].Partnerships || [];
      }
    } catch (error) {
      return res.status(500).json(apiResponseErr(null, 500, false, 'Invalid Partnerships data'));
    }

    partnershipsList.push(newPartnershipEntry);

    if (partnershipsList.length > 10) {
      partnershipsList = partnershipsList.slice(-10);
    }

    const partnershipsJson = JSON.stringify(partnershipsList);

    const [updateResult] = await database.execute('UPDATE Admins SET Partnerships = ? WHERE adminId = ?', [
      partnershipsJson,
      adminId,
    ]);

    if (updateResult.affectedRows === 0) {
      throw { code: 500, message: 'Cannot update Admin Partnerships' };
    }

    return res.status(201).json(apiResponseSuccess({ ...admin, Partnerships: partnershipsList }, 201, true, 'Partnership added successfully'));
  } catch (error) {
    res.status(500).json(apiResponseErr(error.data ?? null, 500, false, error.errMessage ?? error.message));
  }
};

export const partnershipView = async (req, res) => {
  try {
    const id = req.params.adminId;
    const [adminResult] = await database.execute('SELECT * FROM Admins WHERE adminId = ?', [id]);

    if (adminResult.length === 0) {
      return res.status(404).json(apiResponseErr(null, false, 404, 'Admin not found'));
    }

    const admin = adminResult[0];
    console.log('admin', admin);

    if (!admin.Partnerships || !Array.isArray(admin.Partnerships)) {
      return res.status(404).json(apiResponseErr(null, false, 404, 'Partnerships not found or not an array'));
    }

    const last10Partnerships = admin.Partnerships.slice(-10);
    console.log('last10Partnerships', last10Partnerships);
    const transferData = {
      Partnerships: last10Partnerships,
      userName: admin.userName,
    };

    return res.status(200).json(apiResponseSuccess(transferData, 200, true, 'successfully'));
  } catch (error) {
    res
      .status(500)
      .send(apiResponseErr(error.data ?? null, false, error.responseCode ?? 500, error.errMessage ?? error.message));
  }
};

export const creditRefView = async (req, res) => {
  try {
    const id = req.params.adminId;
    const [adminResult] = await database.execute('SELECT * FROM Admins WHERE adminId = ?', [id]);

    if (adminResult.length === 0) {
      return res.status(404).json(apiResponseErr(null, false, 404, 'Admin not found'));
    }

    const admin = adminResult[0];

    if (!admin.Partnerships || !Array.isArray(admin.CreditRefs)) {
      return res.status(404).json(apiResponseErr(null, false, 404, 'CreditRefs not found or not an array'));
    }

    const last10CreditRefs = admin.CreditRefs.slice(-10);
    const transferData = {
      CreditRefs: last10CreditRefs,
      userName: admin.userName,
    };
    return res.status(200).json(apiResponseSuccess(transferData, 200, true, 'successfully'));
  } catch (error) {
    res
      .status(500)
      .send(apiResponseErr(error.data ?? null, false, error.responseCode ?? 500, error.errMessage ?? error.message));
  }
};

export const buildRootPath = async (req, res) => {
  try {
    const { userName, action } = req.params;
    const searchName = req.body.searchName;
    const page = parseInt(req.body.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 5;

    let user;

    if (!globalUsernames) {
      globalUsernames = [];
    }

    if (userName) {
      const userQuery = 'SELECT * FROM admins WHERE userName = ?';
      const [userResult] = await database.execute(userQuery, [userName]);

      if (!userResult.length) {
        throw { code: 404, message: 'User not found' };
      }

      user = userResult[0];
    } else {
      throw { code: 400, message: 'userName parameter is required' };
    }

    if (action === 'store') {
      const newPath = user.userName;
      const indexToRemove = globalUsernames.indexOf(newPath);

      if (indexToRemove !== -1) {
        globalUsernames.splice(indexToRemove + 1);
      } else {
        globalUsernames.push(newPath);
      }

      const likeCondition = searchName ? `AND userName LIKE ?` : '';
      const limitClause = `LIMIT ${(page - 1) * pageSize}, ${pageSize}`;
      const query = `
          SELECT * FROM admins
          WHERE createdByUser = ? ${likeCondition}
          ${limitClause}
        `;

      const queryParameters = searchName ? [user.userName, `%${searchName}%`] : [user.userName];

      const [createdUsers] = await database.execute(query, queryParameters);
      console.log('Created Users:', createdUsers);

      const userDetails = {
        createdUsers: createdUsers.map((createdUser) => {
          let creditRef = [];
          let refProfitLoss = [];
          let partnership = [];

          try {
            creditRef = createdUser.CreditRefs ? JSON.parse(createdUser.CreditRefs) : [];
            refProfitLoss = createdUser.Partnerships ? JSON.parse(createdUser.Partnerships) : [];
            partnership = createdUser.Partnerships ? JSON.parse(createdUser.Partnerships) : [];
          } catch (e) {
            console.error('JSON parsing error:', e);
          }

          return {
            id: createdUser.adminId,
            userName: createdUser.userName,
            roles: createdUser.roles,
            balance: createdUser.balance,
            loadBalance: createdUser.loadBalance,
            creditRef: creditRef,
            refProfitLoss: refProfitLoss,
            partnership: partnership,
            status: createdUser.isActive ? 'Active' : createdUser.locked ? 'Locked' : 'Suspended',
          };
        }),
      };

      const message = 'Path stored successfully';
      return res.status(201).json(apiResponseSuccess({ path: globalUsernames, userDetails }, 201, true, message));
    } else if (action === 'clear') {
      const lastUsername = globalUsernames.pop();

      if (lastUsername) {
        const indexToRemove = globalUsernames.indexOf(lastUsername);

        if (indexToRemove !== -1) {
          globalUsernames.splice(indexToRemove, 1);
        }
      }
    } else if (action === 'clearAll') {
      globalUsernames.length = 0;
    } else {
      throw { code: 400, message: 'Invalid action provided' };
    }

    const updatePathQuery = 'UPDATE admins SET path = ? WHERE adminId = ?';
    await database.execute(updatePathQuery, [JSON.stringify(globalUsernames), user.adminId]);

    const successMessage = action === 'store' ? 'Path stored successfully' : 'Path cleared successfully';
    return res
      .status(200)
      .json(
        apiResponseSuccess({ message: successMessage, path: globalUsernames }, 201, true, { message: successMessage }),
      );
  } catch (error) {
    return res
      .status(500)
      .send(apiResponseErr(error.data ?? null, false, error.responseCode ?? 500, error.errMessage ?? error.message));
  }
};

export const viewSubAdmis = async (req, res) => {
  try {
    const id = req.params.adminId;
    const page = parseInt(req.query.page, 10) || 1;
    const pageSize = parseInt(req.query.pageSize, 10) || 5;
    const searchName = req.query.searchName || '';

    const allowedRoles = ['SubAdmin', 'SubWhiteLabel', 'SubHyperAgent', 'SubSuperAgent', 'SubMasterAgent'];
    const rolesQuery = allowedRoles.map(() => `JSON_CONTAINS(roles, JSON_OBJECT('role', ?), '$')`).join(' OR ');
    const rolesParams = allowedRoles;

    let subAdminsQuery = `
      SELECT adminId, userName, roles, isActive, locked 
      FROM Admins 
      WHERE createdById = ? 
        AND (${rolesQuery})
    `;

    let queryParams = [id, ...rolesParams];

    if (searchName) {
      subAdminsQuery += ` AND userName LIKE ?`;
      queryParams.push(`%${searchName}%`);
    }

    console.log('subAdminsQuery:', subAdminsQuery);
    console.log('queryParams:', queryParams);
    const [subAdminResults] = await database.execute(subAdminsQuery, queryParams);

    if (!subAdminResults || subAdminResults.length === 0) {
      return res.status(404).json(apiResponseErr(null, 404, false, 'No data found'));
    }

    const users = subAdminResults.map((user) => ({
      adminId: user.adminId,
      userName: user.userName,
      roles: user.roles,
      Status: user.isActive ? 'Active' : !user.locked ? 'Locked' : !user.isActive ? 'Suspended' : '',
    }));

    const totalCount = users.length;
    const totalPages = Math.ceil(totalCount / pageSize);
    const paginatedUsers = users.slice((page - 1) * pageSize, page * pageSize);

    return res.status(200).json(
      apiResponseSuccess(
        {
          data: paginatedUsers,
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
    console.log('error', error);
    res
      .status(500)
      .send(apiResponseErr(error.data ?? null, false, error.responseCode ?? 500, error.errMessage ?? error.message));
  }
};

export const singleSubAdmin = async (req, res) => {
  try {
    const adminId = req.params.adminId;

    const [subAdmin] = await database.execute('SELECT * FROM Admins WHERE adminId = ?', [adminId]);
    if (!subAdmin) {
      return res.status(500).json(apiResponseErr(null, 500, false, 'Sub Admin not found with the given Id'));
    }
    const data = {
      userName: subAdmin[0].userName,
      roles: subAdmin[0].roles,
    };
    return res.status(200).json(apiResponseSuccess(data, 200, true, 'successfully'));
  } catch (error) {
    res
      .status(500)
      .send(apiResponseErr(error.data ?? null, false, error.responseCode ?? 500, error.errMessage ?? error.message));
  }
};

export const subAdminPermission = async (req, res) => {
  try {
    const subAdminId = req.params.adminId;
    const { permission } = req.body;
    if (!subAdminId) {
      return res.status(400).json(apiResponseErr(null, 400, false, 'Id not found'));
    }
    const [subAdminRows] = await database.execute('SELECT * FROM Admins WHERE adminId = ?', [subAdminId]);
    const subAdmin = subAdminRows[0];

    if (!subAdmin) {
      return res.status(400).json(apiResponseErr(null, 400, false, 'Sub Admin not found'));
    }

    const roles = subAdmin.roles;

    if (roles.length === 0) {
      return res.status(400).send({ message: 'Roles not found for Sub Admin' });
    }
    roles[0].permission = permission;

    await database.execute('UPDATE Admins SET roles = ? WHERE adminId = ?', [JSON.stringify(roles), subAdminId]);

    return res
      .status(201)
      .json(apiResponseSuccess(true, 201, true, `${subAdmin.userName} permissions edited successfully`));
  } catch (error) {
    console.log('error', error);
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

export const userStatus = async (req, res) => {
  try {
    const userName = req.params.userName;
    const [userRows] = await database.execute('SELECT * FROM Admins WHERE userName = ?', [userName]);
    const user = userRows[0];

    if (!user) {
      return res.status(400).json(apiResponseErr(null, 400, false, 'User not found'));
    }

    const userStatus = {
      Status: user.isActive ? 'Active' : !user.locked ? 'Locked' : !user.isActive ? 'Suspended' : '',
    };

    return res.status(200).json(apiResponseSuccess(userStatus, 200, true, 'successfully'));
  } catch (error) {
    res
      .status(500)
      .send(apiResponseErr(error.data ?? null, false, error.responseCode ?? 500, error.errMessage ?? error.message));
  }
};
