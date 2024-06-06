import { apiResponseErr, apiResponseSuccess } from '../helper/errorHandler.js';
import { database } from '../dbConnection/database.service.js';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import admins from '../models/admin.model.js';
import { string } from '../constructor/string.js';
import { Op, fn, col } from 'sequelize';
import sequelize from '../db.js';

/**
 *Op refers to the set of operators provided by Sequelize's query language ,
 *fn is function for call SQL functions directly within your Sequelize queries,
 *col function is used to reference a column in your database within a Sequelize query

 **/

const globalUsernames = [];
// done
export const createAdmin = async (req, res) => {
  try {
    const user = req.user;
    const { userName, password, roles } = req.body;

    const existingAdmin = await admins.findOne({ where: { userName: userName } });
    if (existingAdmin) {
      throw apiResponseErr(null, false, 400, "Admin Already Exists")
    }
    if (user.isActive === false || user.locked === false) {
      throw apiResponseErr(null, false, 400, "Account is Not Active")
    }
    const defaultPermission = ['all-access'];

    const rolesWithDefaultPermission = roles.map(role => ({
      role,
      permission: defaultPermission
    }));

    const newAdmin = await admins.create({
      adminId: uuidv4(),
      userName,
      password,
      roles: rolesWithDefaultPermission,
      createdById: user.adminId,
      createdByUser: user.userName,
    });

    const isSubRole = [
      string.subWhiteLabel,
      string.subAdmin,
      string.subHyperAgent,
      string.subSuperAgent,
      string.subMasterAgent
    ].includes(user.roles[0].role);

    if (isSubRole) {
      await newAdmin.update({ createdById: user.createdById || user.adminId });
    }

    return res.status(201).json(apiResponseSuccess(newAdmin, true, 201, 'Admin created successfully'));
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
      return res.status(400).json(apiResponseErr(null, false, 400, 'Account is in Inactive Mode'));
    }

    const existingAdmin = await admins.findOne({ where: { userName } });
    if (existingAdmin) {
      return res.status(400).json(apiResponseErr(null, false, 400, 'Admin already exists'));
    }

    let subRole = '';
    for (let i = 0; i < user.roles.length; i++) {
      if (user.roles[i].role.includes(string.superAdmin)) {
        subRole = string.subAdmin;
      } else if (user.roles[i].role.includes(string.whiteLabel)) {
        subRole = string.subWhiteLabel;
      } else if (user.roles[i].role.includes(string.hyperAgent)) {
        subRole = string.subHyperAgent;
      } else if (user.roles[i].role.includes(string.superAgent)) {
        subRole = string.subSuperAgent;
      } else if (user.roles[i].role.includes(string.masterAgent)) {
        subRole = string.subMasterAgent;
      } else {
        return res.status(400).json(apiResponseErr(null, false, 400, 'Invalid user role for creating sub-admin'));
      }
    }

    const adminId = uuidv4();
    const createdByUser = user.userName;
    const createdById = user.adminId;

    const newSubAdmin = await admins.create({
      adminId,
      userName,
      password,
      roles: [{ role: subRole, permission: roles[0].permission }],
      createdById,
      createdByUser,
    });

    return res.status(201).json(apiResponseSuccess(newSubAdmin, true, 201, 'Sub Admin created successfully'));
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
    res.status(500).send(apiResponseErr(error.data ?? null, false, error.responseCode ?? 500, error.errMessage ?? error.message));
  }
};
// done
export const viewAllCreates = async (req, res) => {
  try {
    const createdById = req.params.createdById;
    const page = parseInt(req.query.page, 10) || 1;
    const pageSize = parseInt(req.query.pageSize, 10) || 5;

    const searchQuery = req.query.userName ? { userName: { [Op.like]: `%${req.query.userName}%` } } : {};
    const allowedRoles = [
      string.superAdmin,
      string.whiteLabel,
      string.hyperAgent,
      string.superAgent,
      string.masterAgent,
    ];

    const totalRecords = await admins.count({
      where: {
        createdById,
        ...searchQuery,
        [Op.or]: allowedRoles.map(role => fn('JSON_CONTAINS', col('roles'), JSON.stringify({ role })))
      }
    });

    if (totalRecords === 0) {
      return res.status(404).json(apiResponseErr(null, 404, false, 'No records found'));
    }

    const offset = (page - 1) * pageSize;
    const adminsData = await admins.findAll({
      where: {
        createdById,
        ...searchQuery,
        [Op.or]: allowedRoles.map(role => fn('JSON_CONTAINS', col('roles'), JSON.stringify({ role })))
      },
      offset,
      limit: pageSize
    });

    const users = adminsData.map(admin => ({
      adminId: admin.adminId,
      userName: admin.userName,
      roles: admin.roles,
      balance: admin.balance,
      loadBalance: admin.loadBalance,
      creditRefs: admin.creditRefs ? JSON.parse(admin.creditRefs) : [],
      createdById: admin.createdById,
      createdByUser: admin.createdByUser,
      partnerships: admin.partnerships ? JSON.parse(admin.partnerships) : [],
      status: admin.isActive ? 'active' : admin.locked ? 'locked' : 'suspended',
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
        true,
        200,
        'Success',
      ),
    );
  } catch (error) {
    console.error('Error:', error);
    res
      .status(500)
      .send(apiResponseErr(error.data ?? null, false, error.responseCode ?? 500, error.errMessage ?? error.message));
  }
};
// done
export const viewAllSubAdminCreates = async (req, res) => { 
  try {
    const createdById = req.params.createdById;
    const page = parseInt(req.query.page, 10) || 1;
    const pageSize = parseInt(req.query.pageSize, 10) || 5;

    const searchQuery = req.query.userName ? { userName: { [Op.like]: `%${req.query.userName}%` } } : {};

    const allowedRoles = [
      string.subAdmin,
      string.subHyperAgent,
      string.subMasterAgent,
      string.subWhiteLabel,
      string.subSuperAgent
    ];

    const totalRecords = await admins.count({
      where: {
        createdById,
        ...searchQuery,
        [Op.or]: allowedRoles.map(role => fn('JSON_CONTAINS', col('roles'), JSON.stringify({ role })))
      }
    });

    if (totalRecords === 0) {
      return res.status(404).json(apiResponseErr(null, 404, false, 'No records found'));
    }

    const offset = (page - 1) * pageSize;
    const adminsData = await admins.findAll({
      where: {
        createdById,
        ...searchQuery,
        [Op.or]: allowedRoles.map(role => fn('JSON_CONTAINS', col('roles'), JSON.stringify({ role })))
      },
      offset,
      limit: pageSize
    });

    const users = adminsData.map((admin) => ({
      adminId: admin.adminId,
      userName: admin.userName,
      roles: admin.roles,
      balance: admin.balance,
      loadBalance: admin.loadBalance,
      creditRefs: admin.creditRefs ? JSON.parse(admin.creditRefs) : [],
      createdById: admin.createdById,
      createdByUser: admin.createdByUser,
      partnerships: admin.partnerships ? JSON.parse(admin.partnerships) : [],
      status: admin.isActive ? 'active' : admin.locked ? 'locked' : 'suspended',
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
        true,
        200,
        'Success',
      ),
    );
  } catch (error) {
    res
      .status(500)
      .send(apiResponseErr(error.data ?? null, false, error.responseCode ?? 500, error.errMessage ?? error.message));
  }
};
// done
export const editCreditRef = async (req, res) => {
  try {
    const adminId = req.params.adminId;
    const { creditRef, password } = req.body;

    if (typeof creditRef !== 'number') {
      return res.status(400).json(apiResponseErr(null, false, 400, 'CreditRef must be a number'));
    }
    const admin = await admins.findOne({ where: { adminId } });
    if (!admin) {
      return res.status(404).json(apiResponseErr(null, false, 404, 'Admin Not Found'));
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      return res.status(401).json(apiResponseErr(null, false, 401, 'Invalid password'));
    }

    if (!admin.isActive || admin.locked) {
      return res.status(403).json(apiResponseErr(null, false, 403, 'Admin is Suspended or Locked'));
    }

    const newCreditRefEntry = {
      value: creditRef,
      date: new Date(),
    };

    let creditRefList = [];
    if (typeof admin.creditRefs === 'string') {
      try {
        creditRefList = JSON.parse(admin.creditRefs);
      } catch (error) {
        return res.status(400).json(apiResponseErr(null, false, 400, 'Invalid creditRefs JSON'));
      }
    } else if (Array.isArray(admin.creditRefs)) {
      creditRefList = admin.creditRefs;
    }

    creditRefList.push(newCreditRefEntry);

    if (creditRefList.length > 10) {
      creditRefList.shift();
    }

    admin.creditRefs = JSON.stringify(creditRefList);
    await admin.save();

    const adminDetails = {
      adminId: admin.adminId,
      userName: admin.userName,
    };

    return res.status(201).json(apiResponseSuccess({ adminDetails, creditRef: creditRefList }, true, 201, 'CreditRef Edited successfully'));
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

    if (typeof partnership !== 'number') {
      return res.status(400).json(apiResponseErr(null, false, 400, 'partnership must be a number'));
    }
    const admin = await admins.findOne({ where: { adminId } });
    if (!admin) {
      return res.status(404).json(apiResponseErr(null, false, 404, 'Admin not found'));
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      return res.status(401).json(apiResponseErr(null, false, 401, 'Invalid password'));
    }

    if (!admin.isActive || admin.locked) {
      return res.status(403).json(apiResponseErr(null, false, 403, 'Admin is suspended or locked'));
    }

    const newPartnershipEntry = {
      value: partnership,
      date: new Date(),
    };

    let partnershipsList;
    try {
      partnershipsList = admin.partnerships ? JSON.parse(admin.partnerships) : [];
    } catch (error) {
      return res.status(500).json(apiResponseErr(null, false, 500, 'Invalid Partnerships data'));
    }

    partnershipsList.push(newPartnershipEntry);

    if (partnershipsList.length > 10) {
      partnershipsList = partnershipsList.slice(-10);
    }

    admin.partnerships = JSON.stringify(partnershipsList);
    await admin.save();

    const adminDetails = {
      adminId: admin.adminId,
      userName: admin.userName,
    };

    return res.status(201).json(apiResponseSuccess({ adminDetails, partnerships: partnershipsList }, true, 201, 'Partnership Edit successfully'));
  } catch (error) {
    res
      .status(500)
      .send(apiResponseErr(error.data ?? null, false, error.responseCode ?? 500, error.errMessage ?? error.message));
  }
};
// done
export const partnershipView = async (req, res) => {
  try {
    const adminId = req.params.adminId;

    const admin = await admins.findOne({ where: { adminId } });
    if (!admin) {
      return res.status(404).json(apiResponseErr(null, false, 404, 'Admin not found'));
    }

    let partnershipsList;
    try {
      partnershipsList = admin.partnerships ? JSON.parse(admin.partnerships) : [];
    } catch (error) {
      return res.status(500).json(apiResponseErr(null, false, 500, 'Invalid Partnerships data'));
    }

    if (!Array.isArray(partnershipsList)) {
      return res.status(404).json(apiResponseErr(null, false, 404, 'Partnerships not found or not an array'));
    }

    const last10Partnerships = partnershipsList.slice(-10);

    const transferData = {
      partnerships: last10Partnerships,
      userName: admin.userName,
    };

    return res.status(200).json(apiResponseSuccess(transferData, true, 200, 'success'));
  } catch (error) {
    return res.status(500).send(apiResponseErr(error.data ?? null, false, error.responseCode ?? 500, error.errMessage ?? error.message));
  }
};
// done
export const creditRefView = async (req, res) => {
  try {
    const adminId = req.params.adminId;

    const admin = await admins.findOne({ where: { adminId } });
    if (!admin) {
      return res.status(404).json(apiResponseErr(null, false, 404, 'Admin not found'));
    }

    let creditRefList;
    try {
      creditRefList = admin.creditRefs ? JSON.parse(admin.creditRefs) : [];
    } catch (error) {
      return res.status(500).json(apiResponseErr(null, false, 500, 'Invalid CreditRefs data'));
    }

    if (!Array.isArray(creditRefList)) {
      return res.status(404).json(apiResponseErr(null, false, 404, 'CreditRefs not found or not an array'));
    }

    const last10CreditRefs = creditRefList.slice(-10);

    const transferData = {
      creditRefs: last10CreditRefs,
      userName: admin.userName,
    };

    return res.status(200).json(apiResponseSuccess(transferData, 200, true, 'Success'));
  } catch (error) {
    return res.status(500).send(apiResponseErr(error.data ?? null, false, error.responseCode ?? 500, error.errMessage ?? error.message));
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
      createdByUser: admin.createdByUser
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
      user = await admins.findOne({ where: { userName } });

      if (!user) {
        throw { code: 404, message: 'User not found' };
      }
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

      const likeCondition = searchName ? { userName: { [Op.like]: `%${searchName}%` } } : {};
      const createdUsers = await admins.findAll({
        where: {
          createdByUser: user.userName,
          ...likeCondition,
        },
        offset: (page - 1) * pageSize,
        limit: pageSize,
      });

      const userDetails = {
        createdUsers: createdUsers.map((createdUser) => {
          let creditRef = [];
          let refProfitLoss = [];
          let partnership = [];

          try {
            creditRef = createdUser.creditRefs ? JSON.parse(createdUser.creditRefs) : [];
            refProfitLoss = createdUser.refProfitLoss ? JSON.parse(createdUser.refProfitLoss) : [];
            partnership = createdUser.partnerships ? JSON.parse(createdUser.partnerships) : [];
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

    await user.update({ path: JSON.stringify(globalUsernames) });

    const successMessage = action === 'store' ? 'Path stored successfully' : 'Path cleared successfully';
    return res
      .status(200)
      .json(
        apiResponseSuccess({ message: successMessage, path: globalUsernames }, true, 200, successMessage),
      );
  } catch (error) {
    return res
      .status(500)
      .send(apiResponseErr(error.data ?? null, false, error.responseCode ?? 500, error.errMessage ?? error.message));
  }
};
// done
export const viewSubAdmins = async (req, res) => {
  try {
    const id = req.params.adminId;
    const page = parseInt(req.query.page, 10) || 1;
    const pageSize = parseInt(req.query.pageSize, 10) || 5;
    const searchName = req.query.searchName || '';

    const allowedRoles = [
      string.subAdmin,
      string.subHyperAgent,
      string.subMasterAgent,
      string.subWhiteLabel,
      string.subSuperAgent
    ];

    const subAdmins = await admins.findAll({
      attributes: ['adminId', 'userName', 'roles', 'isActive', 'locked'],
      where: {
        createdById: id,
        [Op.or]: allowedRoles.map(role => {
          return sequelize.where(
            sequelize.fn('JSON_CONTAINS', sequelize.col('roles'), JSON.stringify({ role })),
            true
          );
        }),
        userName: {
          [Op.like]: `%${searchName}%`
        }
      },
    });

    if (!subAdmins || subAdmins.length === 0) {
      return res.status(404).json(apiResponseErr(null, false, 404, 'No data found'));
    }

    const users = subAdmins.map(user => ({
      adminId: user.adminId,
      userName: user.userName,
      roles: user.roles,
      status: user.isActive ? 'active' : !user.locked ? 'locked' : 'suspended',
    }));

    const totalCount = users.length;
    const totalPages = Math.ceil(totalCount / pageSize);
    const paginatedUsers = users.slice((page - 1) * pageSize, page * pageSize);

    return res.status(200).json(apiResponseSuccess(paginatedUsers, true, 200, 'Success', {
      currentPage: page,
      totalPages: totalPages,
      totalCount: totalCount,
    }));
  } catch (error) {
    return res.status(500).json(apiResponseErr(error.data ?? null, false, error.responseCode ?? 500, error.errMessage ?? error.message));
  }
};
// done
export const singleSubAdmin = async (req, res) => {
  try {
    const adminId = req.params.adminId;

    const subAdmin = await admins.findOne({
      attributes: ['userName', 'roles'],
      where: {
        adminId: adminId
      }
    });

    if (!subAdmin) {
      return res.status(404).json(apiResponseErr(null, false, 404, 'Sub Admin not found with the given Id'));
    }

    const data = {
      userName: subAdmin.userName,
      roles: subAdmin.roles,
    };

    return res.status(200).json(apiResponseSuccess(data, true, 200, 'Success'));
  } catch (error) {
    res.status(500).json(apiResponseErr(error.data ?? null, false, error.responseCode ?? 500, error.errMessage ?? error.message));
  }
};
// done
export const subAdminPermission = async (req, res) => {
  try {
    const subAdminId = req.params.adminId;
    const { permission } = req.body;

    if (!subAdminId) {
      return res.status(400).json(apiResponseErr(null, false, 400, 'Id not found'));
    }

    const subAdmin = await admins.findOne({
      where: {
        adminId: subAdminId
      }
    });

    if (!subAdmin) {
      return res.status(404).json(apiResponseErr(null, false, 404, 'Sub Admin not found'));
    }

    let roles = subAdmin.roles;

    if (!roles || roles.length === 0) {
      return res.status(400).json(apiResponseErr(null, false, 400, 'Roles not found for Sub Admin'));
    }

    roles[0].permission = [...roles[0].permission, permission];

    await admins.update(
      { roles: roles },
      {
        where: {
          adminId: subAdminId
        }
      }
    );

    return res.status(200).json(apiResponseSuccess(null, true, 200, `${subAdmin.userName} permissions edited successfully`));
  } catch (error) {
    res.status(500).json(apiResponseErr(error.data ?? null, false, error.responseCode ?? 500, error.errMessage ?? error.message));
  }
};
// done
export const userStatus = async (req, res) => {
  try {
    const userName = req.params.userName;

    const user = await admins.findOne({
      where: {
        userName: userName
      }
    });

    if (!user) {
      return res.status(400).json(apiResponseErr(null, false, 400, 'User not found'));
    }

    const userStatus = {
      status: user.isActive ? 'active' : user.locked ? 'locked' : 'suspended',
    };

    return res.status(200).json(apiResponseSuccess(userStatus, true, 200, 'success'));
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json(apiResponseErr(error.data ?? null, false, error.responseCode ?? 500, error.errMessage ?? error.message));
  }
};
