import { apiResponseErr, apiResponseSuccess } from '../helper/errorHandler.js';
import { database } from '../dbConnection/database.service.js';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import admins from '../models/admin.model.js';
import { stringConstructor } from '../constructor/stringConstructor.js';
import { Op } from 'sequelize'; /*** Op refers to the set of operators provided by Sequelize's query language */

const globalUsernames = [];
// done
export const createAdmin = async (req, res) => {
  try {
    const user = req.user;
    const { userName, password, roles } = req.body;

    const existingAdmin = await admins.findOne({ where: { userName } });
    if (existingAdmin) {
      return res.status(400).json(apiResponseErr(null, 400, false, 'Admin already exists'));
    }

    const defaultPermission = ['All-Access'];
    const rolesWithDefaultPermission = Array.isArray(roles)
      ? roles.map((role) => ({ role, permission: defaultPermission }))
      : [{ role: roles, permission: defaultPermission }];

    const newAdmin = await admins.create({
      adminId: uuidv4(),
      userName,
      password,
      roles: rolesWithDefaultPermission,
      createdById: user.adminId,
      createdByUser: user.userName,
    });

    return res.status(201).json(apiResponseSuccess(newAdmin, 201, true, 'Admin created successfully'));
  } catch (error) {
    res
      .status(500)
      .send(apiResponseErr(error.data ?? null, false, error.responseCode ?? 500, error.errMessage ?? error.message));
  }
};
// done
export const createSubAdmin = async (req, res) => {
  try {
    const { userName, password, roles } = req.body;
    const user = req.user;

    if (user.isActive === false) {
      return res.status(400).json(apiResponseErr(null, 400, false, 'Account is in Inactive Mode'));
    }

    const existingAdmin = await admins.findOne({ where: { userName } });
    if (existingAdmin) {
      return res.status(400).json(apiResponseErr(null, 400, false, 'Admin already exists'));
    }

    const passwordSalt = await bcrypt.genSalt();
    const encryptedPassword = await bcrypt.hash(password, passwordSalt);

    let subRole = '';
    for (let i = 0; i < user.roles.length; i++) {
      if (user.roles[i].role.includes(stringConstructor.superAdmin)) {
        subRole = stringConstructor.subAdmin;
      } else if (user.roles[i].role.includes(stringConstructor.whiteLabel)) {
        subRole = stringConstructor.subWhiteLabel;
      } else if (user.roles[i].role.includes(stringConstructor.hyperAgent)) {
        subRole = stringConstructor.subHyperAgent;
      } else if (user.roles[i].role.includes(stringConstructor.superAgent)) {
        subRole = stringConstructor.subSuperAgent;
      } else if (user.roles[i].role.includes(stringConstructor.masterAgent)) {
        subRole = stringConstructor.subMasterAgent;
      } else {
        throw { code: 400, message: 'Invalid user role for creating sub-admin' };
      }
    }

    const adminId = uuidv4();
    const createdByUser = user.userName;
    const createdById = user.adminId;

    const newSubAdmin = await admins.create({
      adminId,
      userName,
      password: encryptedPassword,
      roles: [{ role: subRole, permission: roles[0].permission }],
      createdById,
      createdByUser,
    });

    return res.status(201).json(apiResponseSuccess(newSubAdmin, 201, true, 'Sub Admin created successfully'));
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
    let admin = await admins.findOne({ where: { userName } });
    if (!admin) {
      return res.status(400).json(apiResponseErr(null, 400, false, 'Admin not found'));
    }
    const loginTime = admin.lastLoginTime;
    console.log('loginTime', loginTime);
    let clientIP = req.ip;
    const forwardedFor = req.headers['x-forwarded-for'];
    if (forwardedFor) {
      const forwardedIps = forwardedFor.split(',');
      clientIP = forwardedIps[0].trim();
    }
    const data = await fetch(`http://ip-api.com/json/${clientIP}`);
    const collect = await data.json();
    await admins.update({ lastLoginTime: loginTime }, { where: { userName } });
    const responseObj = {
      userName: admin.userName,
      ip: {
        IP: clientIP,
        country: collect.country,
        region: collect.regionName,
        timezone: collect.timezone,
      },
      isActive: admin.isActive,
      locked: admin.locked,
      lastLoginTime: loginTime,
    };

    return res.status(200).json(apiResponseSuccess(responseObj, 200, true, 'Data Fetched'));
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

    const searchQuery = req.query.userName ? { userName: { [Op.like]: `%${req.query.userName}%` } } : {};
    console.log('createdById:', createdById);
    console.log('searchQuery:', searchQuery);
    const allowedRoles = [
      stringConstructor.whiteLabel,
      stringConstructor.hyperAgent,
      stringConstructor.superAgent,
      stringConstructor.masterAgent,
    ];
    const rolesQuery = allowedRoles.map((role) => ({ roles: { [Op.contains]: [{ role }] } }));

    const { count, rows: admin } = await admins.findAndCountAll({
      where: {
        createdById,
        [Op.or]: rolesQuery.map((role) => ({ roles: { [Op.like]: `%${JSON.stringify(role)}%` } })),
        ...searchQuery,
      },
      offset: (page - 1) * pageSize,
      limit: pageSize,
    });

    if (!admin || admin.length === 0) {
      return res.status(404).json(apiResponseErr(null, 404, false, 'No records found'));
    }

    const users = admin.map((admin) => ({
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

    const totalPages = Math.ce;
    il(count / pageSize);

    return res.status(200).json(
      apiResponseSuccess(
        {
          users,
          totalRecords: count,
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
      createdById: admin.createdById,
      createdByUser: admin.createdByUser,
    };
    const trashId = uuidv4();

    // Insert into Trash table
    const [backupResult] = await database.execute(
      `INSERT INTO Trash (trashId, roles, userName, password, balance, loadBalance, CreditRefs, Partnerships, createdById, adminId, createdByUser) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?)`,
      [
        trashId,
        updatedTransactionData.roles || null,
        updatedTransactionData.userName || null,
        updatedTransactionData.password || null,
        updatedTransactionData.balance !== null ? updatedTransactionData.balance : 0,
        updatedTransactionData.loadBalance !== null ? updatedTransactionData.loadBalance : 0,
        updatedTransactionData.CreditRefs || null,
        updatedTransactionData.Partnerships || null,
        updatedTransactionData.createdById || null,
        updatedTransactionData.adminId || null,
        updatedTransactionData.createdByUser || null,
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
      createdById: existingAdminUser[0].createdById,
      adminId: existingAdminUser[0].adminId,
      createdByUser: existingAdminUser[0].createdByUser,
    };

    const [restoreResult] = await database.execute(
      `INSERT INTO admins (adminId, userName, password, roles, balance, loadBalance, createdById, CreditRefs, Partnerships,createdByUser)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?,?)`,
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
        restoreRemoveData.createdByUser,
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

    return res
      .status(201)
      .json(
        apiResponseSuccess({ ...admin, Partnerships: partnershipsList }, 201, true, 'Partnership added successfully'),
      );
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
