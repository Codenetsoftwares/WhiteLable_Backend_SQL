import { apiResponseErr, apiResponseSuccess } from '../helper/errorHandler.js';
import { v4 as uuid4 } from 'uuid';
import bcrypt from 'bcrypt';
import admins from '../models/admin.model.js';
import { messages, string } from '../constructor/string.js';
import { Op, fn, col, Sequelize } from 'sequelize';
import sequelize from '../db.js';
import { statusCode } from '../helper/statusCodes.js';


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

    const isUserRole = roles.includes('user');

    const existingAdmin = await admins.findOne({ where: { userName } });

    if (existingAdmin) {
      const errorMessage = isUserRole ? messages.userExists : messages.adminExists;
      throw apiResponseErr(null, false, statusCode.exist, errorMessage);
    }

    if (user.isActive === false || user.locked === false) {
      throw apiResponseErr(null, false, statusCode.badRequest, messages.accountInactive);
    }

    const defaultPermission = ['all-access'];
    const rolesWithDefaultPermission = roles.map((role) => ({
      role,
      permission: defaultPermission,
    }));

    const newAdmin = await admins.create({
      adminId: uuid4(),
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
      string.subMasterAgent,
    ].includes(user.roles[0].role);

    if (isSubRole) {
      await newAdmin.update({ createdById: user.createdById || user.adminId });
    }
    if (user.adminId) {
      await calculateLoadBalance(user.adminId);
    }
    const successMessage = isUserRole ? 'User created successfully' : 'Admin created successfully';

    return res.status(statusCode.create).json(apiResponseSuccess(null, true, statusCode.create, successMessage));
  } catch (error) {
    res
      .status(statusCode.internalServerError)
      .send(apiResponseErr(error.data ?? null, false, error.responseCode ?? statusCode.internalServerError, error.errMessage ?? error.message));
  }
};


// done
export const createSubAdmin = async (req, res) => {
  try {
    const { userName, password, roles } = req.body;
    const user = req.user;

    if (user.isActive === false) {
      return res.status(statusCode.badRequest).json(apiResponseErr(null, false, statusCode.badRequest, messages.accountInactive));
    }

    const existingAdmin = await admins.findOne({ where: { userName } });
    if (existingAdmin) {
      return res.status(statusCode.badRequest).json(apiResponseErr(null, false, statusCode.badRequest, messages.adminExists));
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
        return res.status(statusCode.badRequest).json(apiResponseErr(null, false, statusCode.badRequest, messages.invalidRole));
      }
    }

    const adminId = uuid4();
    const createdByUser = user.userName;
    const createdById = user.adminId;

    const permissionsArray = Array.isArray(roles[0].permission) ? roles[0].permission : [roles[0].permission];

    const newSubAdmin = await admins.create({
      adminId,
      userName,
      password,
      roles: [{ role: subRole, permission: permissionsArray }],
      createdById,
      createdByUser,
    });

    return res.status(statusCode.create).json(apiResponseSuccess(newSubAdmin, true, statusCode.create, messages.subAdminCreated));
  } catch (error) {
    res
      .status(statusCode.internalServerError)
      .send(apiResponseErr(error.data ?? null, false, error.responseCode ?? statusCode.internalServerError, error.errMessage ?? error.message));
  }
};
// done
export const getIpDetail = async (req, res) => {
  try {
    const userName = req.params.userName;
    console.log('userName', userName);
    let admin = await admins.findOne({ where: { userName } });
    if (!admin) {
      return res.status(statusCode.badRequest).json(apiResponseErr(null, false, statusCode.badRequest, messages.adminNotFound));
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
        iP: clientIP,
        country: collect.country,
        region: collect.regionName,
        timezone: collect.timezone,
      },
      isActive: admin.isActive,
      locked: admin.locked,
      lastLoginTime: loginTime,
    };
    return res.status(statusCode.success).json(apiResponseSuccess(responseObj, null, statusCode.success, true, 'Data Fetched'));
  } catch (error) {
    res
      .status(statusCode.internalServerError)
      .send(apiResponseErr(error.data ?? null, false, error.responseCode ?? statusCode.internalServerError, error.errMessage ?? error.message));
  }
};

export const calculateLoadBalance = async (adminId) => {
  const admin = await admins.findOne({ where: { adminId } });
  if (!admin) return 0;

  let totalBalance = admin.balance;

  const children = await admins.findAll({
    where: { createdById: adminId },
  });

  for (const child of children) {
    const childBalance = await calculateLoadBalance(child.adminId);
    totalBalance += childBalance;
  }

  if (admin.loadBalance !== totalBalance) {
    console.log(`Updating loadBalance for adminId ${adminId}: ${admin.loadBalance} -> ${totalBalance}`);
    await admin.update({ loadBalance: totalBalance });
  }

  return totalBalance;
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
      string.user
    ];

    const totalRecords = await admins.count({
      where: {
        createdById,
        ...searchQuery,
        [Op.or]: allowedRoles.map(role => fn('JSON_CONTAINS', col('roles'), JSON.stringify({ role }))),
      },
    });

    if (totalRecords === 0) {
    return res.status(statusCode.success).json(apiResponseSuccess(null, true, statusCode.success, messages.noRecordsFound));
    }

    const offset = (page - 1) * pageSize;
    const adminsData = await admins.findAll({
      where: {
        createdById,
        ...searchQuery,
        [Op.or]: allowedRoles.map(role => fn('JSON_CONTAINS', col('roles'), JSON.stringify({ role }))),
      },
      offset,
      limit: pageSize,
    });

    const users = adminsData.map(admin => ({
      adminId: admin.adminId,
      userName: admin.userName,
      roles: admin.roles,
      balance: admin.balance,
      loadBalance: admin.loadBalance,
      creditRefs: admin.creditRefs || [],
      createdById: admin.createdById,
      createdByUser: admin.createdByUser,
      partnerships: admin.partnerships || [],
      status: admin.isActive ? 'active' : admin.locked ? 'locked' : 'suspended',
    }));

    const totalPages = Math.ceil(totalRecords / pageSize);

    return res.status(statusCode.success).json(
      apiResponseSuccess(
        users,
        true,
        statusCode.success,
        messages.success,
        {
          totalRecords,
          totalPages,
          currentPage: page,
          pageSize,
        }
      ),
    );
  } catch (error) {
    return res.status(statusCode.internalServerError).json(
      apiResponseErr(error.data ?? null, false, error.responseCode ?? statusCode.internalServerError, error.errMessage ?? error.message),
    );
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
        [Op.or]: allowedRoles.map(role => fn('JSON_CONTAINS', col('roles'), JSON.stringify({ role }))),
      },
    });

    if (totalRecords === 0) {
      return res.status(statusCode.badRequest).json(apiResponseErr(null, false, statusCode.badRequest, messages.noRecordsFound));
    }

    const offset = (page - 1) * pageSize;
    const adminsData = await admins.findAll({
      where: {
        createdById,
        ...searchQuery,
        [Op.or]: allowedRoles.map(role => fn('JSON_CONTAINS', col('roles'), JSON.stringify({ role }))),
      },
      offset,
      limit: pageSize,
    });

    const users = adminsData.map(admin => {
      let creditRefs = [];
      let partnerships = [];

      if (admin.creditRefs) {
        try {
          creditRefs = JSON.parse(admin.creditRefs);
        } catch {
          creditRefs = [];
        }
      }

      if (admin.partnerships) {
        try {
          partnerships = JSON.parse(admin.partnerships);
        } catch {
          partnerships = [];
        }
      }

      return {
        adminId: admin.adminId,
        userName: admin.userName,
        roles: admin.roles,
        balance: admin.balance,
        loadBalance: admin.loadBalance,
        creditRefs,
        createdById: admin.createdById,
        createdByUser: admin.createdByUser,
        partnerships,
        status: admin.isActive ? 'active' : admin.locked ? 'locked' : 'suspended',
      };
    });

    const totalPages = Math.ceil(totalRecords / pageSize);

    return res.status(statusCode.success).json(
      apiResponseSuccess(
        users,
        true,
        statusCode.success,
        messages.success,
        {
          totalRecords,
          totalPages,
          currentPage: page,
          pageSize,
        }
      ),
    );
  } catch (error) {
    return res.status(statusCode.internalServerError).json(
      apiResponseErr(error.data ?? null, false, error.responseCode ?? statusCode.internalServerError, error.errMessage ?? error.message),
    );
  }
}; 
// done
export const editCreditRef = async (req, res) => {
  try {
    const adminId = req.params.adminId;
    const authAdmin = req.user;
    const { creditRef, password } = req.body;

    if (typeof creditRef !== 'number') {
      return res.status(statusCode.badRequest).json(apiResponseErr(null, false, statusCode.badRequest, 'CreditRef must be a number'));
    }
    const admin = await admins.findOne({ where: { adminId } });
    if (!admin) {
      return res.status(statusCode.notFound).json(apiResponseErr(null, false, statusCode.notFound, messages.adminNotFound));
    }

    const isPasswordValid = await bcrypt.compare(password, authAdmin.password);
    if (!isPasswordValid) {
      return res.status(statusCode.badRequest).json(apiResponseErr(null, false, statusCode.badRequest, messages.invalidPassword));
    }

    // if (!admin.isActive || admin.locked) {
    //   return res.status(statusCode.inActive).json(apiResponseErr(null, false, statusCode.inActive, messages.inActiveAdmin));
    // }

    const newCreditRefEntry = {
      value: creditRef,
      date: new Date(),
    };

    let creditRefList = [];
    if (typeof admin.creditRefs === 'string') {
      try {
        creditRefList = JSON.parse(admin.creditRefs);
      } catch (error) {
        return res.status(statusCode.badRequest).json(apiResponseErr(null, false, statusCode.badRequest, messages.invalidCreditRes));
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

    return res.status(statusCode.success).json(apiResponseSuccess({ adminDetails, creditRef: creditRefList }, true, statusCode.success, 'CreditRef Edited successfully'));
  } catch (error) {
    res
      .status(statusCode.internalServerError)
      .send(apiResponseErr(error.data ?? null, false, error.responseCode ?? statusCode.internalServerError, error.errMessage ?? error.message));
  }
};
// done
export const editPartnership = async (req, res) => {
  try {
    const adminId = req.params.adminId;
    const authAdmin = req.user;
    const { partnership, password } = req.body;

    if (typeof partnership !== 'number') {
      return res.status(statusCode.badRequest).json(apiResponseErr(null, false, statusCode.badRequest, messages.numberPartnership));
    }

    const admin = await admins.findOne({ where: { adminId } });
    if (!admin) {
      return res.status(statusCode.notFound).json(apiResponseErr(null, false, statusCode.notFound, messages.adminNotFound));
    }

    const isPasswordValid = await bcrypt.compare(password, authAdmin.password);
    if (!isPasswordValid) {
      return res.status(statusCode.badRequest).json(apiResponseErr(null, false, statusCode.badRequest, messages.invalidPassword));
    }

    // if (!admin.isActive || admin.locked) {
    //   return res.status(statusCode.inActive).json(apiResponseErr(null, false, statusCode.inActive, messages.inActiveAdmin));
    // }

    const newPartnershipEntry = {
      value: partnership,
      date: new Date(),
    };

    let partnershipsList;
    try {
      if (typeof admin.partnerships === 'string' && admin.partnerships.trim() !== '') {
        partnershipsList = JSON.parse(admin.partnerships);
      } else {
        partnershipsList = [];
      }
    } catch (error) {
      return res.status(statusCode.badRequest).json(apiResponseErr(null, false, statusCode.badRequest, messages.invalidPartnership));
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

    return res.status(statusCode.success).json(apiResponseSuccess({ adminDetails, partnerships: partnershipsList }, true, statusCode.success, 'Partnership edited successfully'));
  } catch (error) {
    return res.status(statusCode.internalServerError).json(
      apiResponseErr(error.data ?? null, false, error.responseCode ?? statusCode.internalServerError, error.errMessage ?? error.message)
    );
  }
};
// done
export const partnershipView = async (req, res) => {
  try {
    const adminId = req.params.adminId;

    const admin = await admins.findOne({ where: { adminId } });
    if (!admin) {
      return res.status(statusCode.notFound).json(apiResponseErr(null, false, statusCode.notFound, messages.adminNotFound));
    }

    let partnershipsList;
    if (typeof admin.partnerships === 'string') {
      try {
        partnershipsList = JSON.parse(admin.partnerships);
      } catch (error) {
        return res.status(statusCode.internalServerError).json(apiResponseErr(null, false, statusCode.internalServerError, messages.invalidPartnership));
      }
    } else if (Array.isArray(admin.partnerships)) {
      partnershipsList = admin.partnerships;
    } else {
      partnershipsList = [];
    }

    if (!Array.isArray(partnershipsList)) {
      return res.status(statusCode.badRequest).json(apiResponseErr(null, false, statusCode.badRequest, 'partnerships not found or not an array'));
    }

    const last10partnerships = partnershipsList.slice(-10);

    const transferData = {
      partnerships: last10partnerships,
      userName: admin.userName,
    };

    return res.status(statusCode.success).json(apiResponseSuccess(transferData, true, statusCode.success, messages.success));
  } catch (error) {
    return res.status(statusCode.internalServerError).send(apiResponseErr(error.data ?? null, false, error.responseCode ?? statusCode.internalServerError, error.errMessage ?? error.message));
  }
};
// done
export const creditRefView = async (req, res) => {
  try {
    const adminId = req.params.adminId;

    const admin = await admins.findOne({ where: { adminId } });
    if (!admin) {
      return res.status(statusCode.notFound).json(apiResponseErr(null, false, statusCode.notFound, messages.adminNotFound));
    }

    let creditRefList;
    if (typeof admin.creditRefs === 'string') {
      try {
        creditRefList = JSON.parse(admin.creditRefs);
      } catch (error) {
        return res.status(statusCode.internalServerError).json(apiResponseErr(null, false, statusCode.internalServerError, messages.invalidCreditRes));
      }
    } else if (Array.isArray(admin.creditRefs)) {
      creditRefList = admin.creditRefs;
    } else {
      creditRefList = [];
    }

    if (!Array.isArray(creditRefList)) {
      return res.status(statusCode.badRequest).json(apiResponseErr(null, false, statusCode.badRequest, 'creditRefs not found or not an array'));
    }

    const last10creditRefs = creditRefList.slice(-10);

    const transferData = {
      creditRefs: last10creditRefs,
      userName: admin.userName,
    };
    return res.status(statusCode.success).json(apiResponseSuccess(transferData, true, statusCode.success, messages.success));
  } catch (error) {
    return res.status(statusCode.internalServerError).send(apiResponseErr(error.data ?? null, false, error.responseCode ?? statusCode.internalServerError, error.errMessage ?? error.message));
  }
};
// done
export const activeStatus = async (req, res) => {
  try {
    const adminId = req.params.adminId;
    const activateStatus = await admins.findOne({ where: { adminId } });
    const active = {
      adminId: activateStatus.adminId,
      isActive: activateStatus.isActive,
      locked: activateStatus.locked,
      status: activateStatus.isActive
        ? 'active'
        : !activateStatus.locked
          ? 'locked'
          : !activateStatus.isActive
            ? 'suspended'
            : '',
    };
    return res.status(statusCode.success).json(apiResponseSuccess(active, null, statusCode.success, true, 'successfully'));
  } catch (error) {
    res
      .status(statusCode.internalServerError)
      .send(apiResponseErr(error.data ?? null, false, error.responseCode ?? statusCode.internalServerError, error.errMessage ?? error.message));
  }
};
// done
export const profileView = async (req, res) => {
  try {
    const userName = req.params.userName;
    const admin = await admins.findOne({ where: { userName } });
    if (!admin) {
      return res.status(statusCode.badRequest).json(apiResponseErr(null, statusCode.badRequest, false, messages.adminNotFound));
    }
    const transferData = {
      adminId: admin.adminId,
      roles: admin.roles,
      userName: admin.userName,
    };
    return res.status(statusCode.success).json(apiResponseSuccess(transferData, null, statusCode.success, true, 'successfully'));
  } catch (error) {
    res
      .status(statusCode.internalServerError)
      .send(apiResponseErr(error.data ?? null, false, error.responseCode ?? statusCode.internalServerError, error.errMessage ?? error.message));
  }
};
// done
export const buildRootPath = async (req, res) => {
  try {
    const { userName, action } = req.params;
    const searchName = req.query.searchName;
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 5;
    const allowedRoles = [
      string.superAdmin,
      string.whiteLabel,
      string.hyperAgent,
      string.superAgent,
      string.masterAgent,
      string.user
    ];
    if (!globalUsernames) {
      globalUsernames = [];
    }

    if (!userName) {
      return res.status(statusCode.badRequest).json(apiResponseErr(null, false, statusCode.badRequest, 'userName parameter is required'));
    }

    const user = await admins.findOne({ where: { userName } });

    if (!user) {
      return res.status(statusCode.badRequest).json(apiResponseErr(null, false, statusCode.badRequest, messages.userNotFound));
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
      const totalRecords = await admins.count({
        where: {
          createdByUser: user.userName,
          ...likeCondition,
          [Op.or]: allowedRoles.map(role => fn('JSON_CONTAINS', col('roles'), JSON.stringify({ role }))),
        },
      });

      const totalPages = Math.ceil(totalRecords / pageSize);

      const createdUsers = await admins.findAll({
        where: {
          createdByUser: user.userName,
          ...likeCondition,
          [Op.or]: allowedRoles.map(role => fn('JSON_CONTAINS', col('roles'), JSON.stringify({ role }))),
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
            // console.error('JSON parsing error:', e);
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
            status: createdUser.isActive ? 'active' : createdUser.locked ? 'locked' : 'suspended',
          };
        }),
      };

      const message = 'Path stored successfully';
      return res.status(statusCode.create).json(
        apiResponseSuccess(
          {
            path: globalUsernames,
            userDetails,
            page,
            pageSize,
            totalPages,
            totalRecords
          },
          true,
          statusCode.create,
          message
        )
      );
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
      throw { code: statusCode.badRequest, message: 'Invalid action provided' };
    }

    await user.update({ path: JSON.stringify(globalUsernames) });

    const successMessage = action === 'store' ? 'Path stored successfully' : 'Path cleared successfully';
    return res.status(statusCode.success).json(
      apiResponseSuccess({ path: globalUsernames, page, pageSize, totalPages: 1 }, true, statusCode.success, successMessage)
    );
  } catch (error) {
    return res
      .status(statusCode.internalServerError)
      .send(apiResponseErr(error.data ?? null, false, error.responseCode ?? statusCode.internalServerError, error.errMessage ?? error.message));
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
      return res.status(statusCode.notFound).json(apiResponseErr(null, false, statusCode.notFound, 'No data found'));
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

    return res.status(statusCode.success).json(apiResponseSuccess(paginatedUsers, true, statusCode.success, messages.success, {
      currentPage: page,
      totalPages: totalPages,
      totalCount: totalCount,
    }));
  } catch (error) {
    return res.status(statusCode.internalServerError).json(apiResponseErr(error.data ?? null, false, error.responseCode ?? statusCode.internalServerError, error.errMessage ?? error.message));
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
      return res.status(statusCode.notFound).json(apiResponseErr(null, false, statusCode.notFound, 'Sub Admin not found with the given Id'));
    }

    const data = {
      userName: subAdmin.userName,
      roles: subAdmin.roles,
    };

    return res.status(statusCode.success).json(apiResponseSuccess(data, true, statusCode.success, messages.success));
  } catch (error) {
    res.status(statusCode.internalServerError).json(apiResponseErr(error.data ?? null, false, error.responseCode ?? statusCode.internalServerError, error.errMessage ?? error.message));
  }
};
// done
export const subAdminPermission = async (req, res) => {
  try {
    const subAdminId = req.params.adminId;
    const { permission } = req.body;

    if (!subAdminId) {
      return res.status(statusCode.badRequest).json(apiResponseErr(null, false, statusCode.badRequest, 'Id not found'));
    }

    const subAdmin = await admins.findOne({
      where: {
        adminId: subAdminId
      }
    });

    if (!subAdmin) {
      return res.status(statusCode.notFound).json(apiResponseErr(null, false, statusCode.notFound, 'Sub Admin not found'));
    }

    let roles = subAdmin.roles;

    if (!roles || roles.length === 0) {
      return res.status(statusCode.badRequest).json(apiResponseErr(null, false, statusCode.badRequest, 'Roles not found for Sub Admin'));
    }

    const permissionsArray = Array.isArray(permission) ? permission : [permission];

    if (!roles[0]) {
      roles[0] = { permission: [] };
    }

    roles[0].permission = permissionsArray;

    await admins.update(
      { roles: roles },
      {
        where: {
          adminId: subAdminId
        }
      }
    );

    return res.status(statusCode.success).json(apiResponseSuccess(null, true, statusCode.success, `${subAdmin.userName} permissions edited successfully`));
  } catch (error) {
    res.status(statusCode.internalServerError).json(apiResponseErr(error.data ?? null, false, error.responseCode ?? statusCode.internalServerError, error.errMessage ?? error.message));
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
      return res.status(statusCode.badRequest).json(apiResponseErr(null, false, statusCode.badRequest, messages.userNotFound));
    }

    const userStatus = {
      status: user.isActive ? 'active' : user.locked ? 'locked' : 'suspended',
    };

    return res.status(statusCode.success).json(apiResponseSuccess(userStatus, true, statusCode.success, messages.success));
  } catch (error) {
    console.error('Error:', error);
    res.status(statusCode.internalServerError).json(apiResponseErr(error.data ?? null, false, error.responseCode ?? statusCode.internalServerError, error.errMessage ?? error.message));
  }
};

// export const activateAdmin = async (adminId, isActive, locked) => {
//   try {
//     console.log("adminId:", adminId);

//     const admin = await admins.findByPk(adminId);

//     const rolesToFind = [
//       { role: string.whiteLabel },
//       { role: string.hyperAgent, },
//       { role: string.masterAgent, },
//       { role: string.superAgent, },
//       { role: "SubWhiteLabel" },
//       { role: "SubHyperAgent" },
//       { role: "SubMasterAgent" },
//       { role: "SubSuperAgent" },
//       { role: "SubAdmin" }
//     ];

//     const roleQueries = rolesToFind.map(role =>
//       admins.findAll({
//         where: {
//           createdById: adminId,
//           roles: {
//             [Sequelize.Op.contains]: [role]
//           }
//         }
//       })
//     );

//     const [
//       whiteLabel, hyperAgent, masterAgent, superAgent,
//       subwhiteLabel, subhyperAgent, submasterAgent,
//       subsuperAgent, subAdmin
//     ] = await Promise.all(roleQueries);



//     if (whiteLabel.length == 0 && hyperAgent.length == 0 && masterAgent.length == 0 && superAgent.length == 0
//       && subwhiteLabel.length == 0 && subhyperAgent.length == 0 && submasterAgent.length == 0 && subsuperAgent.length == 0 && subAdmin.length === 0) {
//       if (isActive === true) {
//         admin.isActive = true;
//         admin.locked = true;
//       }
//       else if (isActive === false) {
//         if (locked === false) {
//           admin.locked = false;
//           admin.isActive = false;
//         }
//         else {
//           admin.isActive = false;
//           admin.locked = true;
//         }
//       }

//       await admin.save();
//       await Promise.all(hyperAgent.map(data => data.save()));
//       await Promise.all(masterAgent.map(data => data.save()));
//       await Promise.all(whiteLabel.map(data => data.save()));
//       await Promise.all(superAgent.map(data => data.save()));
//       await Promise.all(subhyperAgent.map(data => data.save()));
//       await Promise.all(submasterAgent.map(data => data.save()));
//       await Promise.all(subwhiteLabel.map(data => data.save()));
//       await Promise.all(subsuperAgent.map(data => data.save()));
//       await Promise.all(subAdmin.map(data => data.save()));
//       return
//     }
//     if (!admin) {
//       throw { code: 404, message: "Admin not found" };
//     }
//     if (isActive === true) {
//       admin.isActive = true;
//       admin.locked = true;
//       superAgent.map((data) => {
//         if (data.isActive === false && data.locked === false && data.superActive === true && data.checkActive === true) {

//           data.isActive = true;
//           data.locked = true;
//           data.superActive = false;
//           data.checkActive = false;
//         } //checked
//         else if (data.isActive === false && data.locked === false && data.superActive === true && data.checkActive === false) {

//           data.locked = true;
//           data.superActive = false;
//         } //checked
//         else if (data.isActive === false && data.locked === true && data.superActive === true && data.checkActive === true) {

//           data.isActive = true;
//           data.locked = true;
//           data.superActive = false;
//           data.checkActive = false;
//         } //checked
//         activateAdmin(data._id, data.isActive, data.locked)

//       })

//       hyperAgent.forEach((data) => {
//         if (data.isActive === false && data.locked === false && data.hyperActive === true && data.checkActive === true) {

//           data.isActive = true;
//           data.locked = true;
//           data.hyperActive = false;
//           data.checkActive = false;
//         } //checked
//         else if (data.isActive === false && data.locked === false && data.hyperActive === true && data.checkActive === false) {

//           data.locked = true;
//           data.hyperActive = false;
//         } //checked
//         else if (data.isActive === false && data.locked === true && data.hyperActive === true && data.checkActive === true) {

//           data.isActive = true;
//           data.locked = true;
//           data.hyperActive = false;
//           data.checkActive = false;
//         } //checked

//         activateAdmin(data._id, data.isActive, data.locked)


//       })
//       masterAgent.forEach((data) => {
//         if (data.isActive === false && data.locked === false && data.masterActive === true && data.checkActive === true) {

//           data.isActive = true;
//           data.locked = true;
//           data.masterActive = false;
//           data.checkActive = false;
//         } //checked
//         else if (data.isActive === false && data.locked === false && data.masterActive === true && data.checkActive === false) {

//           data.locked = true;
//           data.masterActive = false;
//         } //checked
//         else if (data.isActive === false && data.locked === true && data.masterActive === true && data.checkActive === true) {

//           data.isActive = true;
//           data.locked = true;
//           data.masterActive = false;
//           data.checkActive = false;
//         } //checked

//         activateAdmin(data._id, data.isActive, data.locked)


//       })
//       whiteLabel.forEach((data) => {
//         if (data.isActive === false && data.locked === false && data.whiteActive === true && data.checkActive === true) {

//           data.isActive = true;
//           data.locked = true;
//           data.whiteActive = false;
//           data.checkActive = false;
//         } //checked
//         else if (data.isActive === false && data.locked === false && data.whiteActive === true && data.checkActive === false) {

//           data.locked = true;
//           data.whiteActive = false;
//         } //checked
//         else if (data.isActive === false && data.locked === true && data.whiteActive === true && data.checkActive === true) {

//           data.isActive = true;
//           data.locked = true;
//           data.whiteActive = false;
//           data.checkActive = false;
//         } //checked
//         activateAdmin(data._id, data.isActive, data.locked)



//       })

//       subAdmin.forEach((data) => {
//         if (data.isActive === false && data.locked === false && data.subAdminActive === true && data.checkActive === true) {

//           data.isActive = true;
//           data.locked = true;
//           data.subAdminActive = false;
//           data.checkActive = false;
//         } //checked
//         else if (data.isActive === false && data.locked === false && data.subAdminActive === true && data.checkActive === false) {

//           data.locked = true;
//           data.subAdminActive = false;
//         } //checked
//         else if (data.isActive === false && data.locked === true && data.subAdminActive === true && data.checkActive === true) {

//           data.isActive = true;
//           data.locked = true;
//           data.subAdminActive = false;
//           data.checkActive = false;
//         } //checked
//         activateAdmin(data._id, data.isActive, data.locked)



//       })


//       // added sub


//       subsuperAgent.map((data) => {
//         if (data.isActive === false && data.locked === false && data.subsuperActive === true && data.checkActive === true) {

//           data.isActive = true;
//           data.locked = true;
//           data.subsuperActive = false;
//           data.checkActive = false;
//         } //checked
//         else if (data.isActive === false && data.locked === false && data.subsuperActive === true && data.checkActive === false) {

//           data.locked = true;
//           data.subsuperActive = false;
//         } //checked
//         else if (data.isActive === false && data.locked === true && data.subsuperActive === true && data.checkActive === true) {

//           data.isActive = true;
//           data.locked = true;
//           data.subsuperActive = false;
//           data.checkActive = false;
//         } //checked
//         activateAdmin(data._id, data.isActive, data.locked)

//       })

//       subhyperAgent.forEach((data) => {
//         if (data.isActive === false && data.locked === false && data.subhyperActive === true && data.checkActive === true) {

//           data.isActive = true;
//           data.locked = true;
//           data.subhyperActive = false;
//           data.checkActive = false;
//         } //checked
//         else if (data.isActive === false && data.locked === false && data.subhyperActive === true && data.checkActive === false) {

//           data.locked = true;
//           data.subhyperActive = false;
//         } //checked
//         else if (data.isActive === false && data.locked === true && data.subhyperActive === true && data.checkActive === true) {

//           data.isActive = true;
//           data.locked = true;
//           data.subhyperActive = false;
//           data.checkActive = false;
//         } //checked

//         activateAdmin(data._id, data.isActive, data.locked)


//       })
//       submasterAgent.forEach((data) => {
//         if (data.isActive === false && data.locked === false && data.submasterActive === true && data.checkActive === true) {

//           data.isActive = true;
//           data.locked = true;
//           data.submasterActive = false;
//           data.checkActive = false;
//         } //checked
//         else if (data.isActive === false && data.locked === false && data.submasterActive === true && data.checkActive === false) {

//           data.locked = true;
//           data.submasterActive = false;
//         } //checked
//         else if (data.isActive === false && data.locked === true && data.submasterActive === true && data.checkActive === true) {

//           data.isActive = true;
//           data.locked = true;
//           data.submasterActive = false;
//           data.checkActive = false;
//         } //checked

//         activateAdmin(data._id, data.isActive, data.locked)


//       })
//       subwhiteLabel.forEach((data) => {
//         if (data.isActive === false && data.locked === false && data.subwhiteActive === true && data.checkActive === true) {

//           data.isActive = true;
//           data.locked = true;
//           data.subwhiteActive = false;
//           data.checkActive = false;
//         } //checked
//         else if (data.isActive === false && data.locked === false && data.subwhiteActive === true && data.checkActive === false) {

//           data.locked = true;
//           data.subwhiteActive = false;
//         } //checked
//         else if (data.isActive === false && data.locked === true && data.subwhiteActive === true && data.checkActive === true) {

//           data.isActive = true;
//           data.locked = true;
//           data.subwhiteActive = false;
//           data.checkActive = false;
//         } //checked
//         activateAdmin(data._id, data.isActive, data.locked)



//       })


//       await admin.save();
//       await Promise.all(hyperAgent.map(data => data.save()));
//       await Promise.all(masterAgent.map(data => data.save()));
//       await Promise.all(whiteLabel.map(data => data.save()));
//       await Promise.all(superAgent.map(data => data.save()));
//       await Promise.all(subhyperAgent.map(data => data.save()));
//       await Promise.all(submasterAgent.map(data => data.save()));
//       await Promise.all(subwhiteLabel.map(data => data.save()));
//       await Promise.all(subsuperAgent.map(data => data.save()));
//       await Promise.all(subAdmin.map(data => data.save()));
//       return { message: "Admin Activated Successfully" };
//     }
//     else if (isActive === false) {
//       if (locked === false) {
//         admin.locked = false;
//         admin.isActive = false;


//         superAgent.forEach((data) => {

//           if (data.isActive === true && data.locked === true && data.superActive === false && data.checkActive === false) {

//             data.isActive = false;
//             data.locked = false;
//             data.superActive = true;
//             data.checkActive = true
//           } //checked

//           else if (data.isActive === false && data.locked === true && data.superActive === true) {
//             data.isActive = false;
//             data.locked = false;
//             data.checkActive = true;

//           }
//           else if (data.isActive === false && data.locked === true && data.superActive === false && data.checkActive === false) {
//             data.locked = false;
//             data.superActive = true;

//           } //checked
//           else if (data.isActive === false && data.locked === true && data.superActive === true && data.checkActive === true) {
//             data.locked = false;

//           } //checked
//           else if (data.isActive === false && data.locked === false && data.superActive === true && data.checkActive === true) {
//             data.isActive = true;
//             data.locked = true;
//             data.superActive = false;
//             data.checkActive === false
//           }
//           activateAdmin(data._id, data.isActive, data.locked)

//         });
//         hyperAgent.forEach((data) => {
//           if (data.isActive === true && data.locked === true && data.hyperActive === false && data.checkActive === false) {

//             data.isActive = false;
//             data.locked = false;
//             data.hyperActive = true;
//             data.checkActive = true
//           } //checked

//           else if (data.isActive === false && data.locked === true && data.hyperActive === true) {
//             data.isActive = false;
//             data.locked = false;
//             data.checkActive = true;

//           }
//           else if (data.isActive === false && data.locked === true && data.hyperActive === false && data.checkActive === false) {
//             data.locked = false;
//             data.hyperActive = true;

//           } //checked
//           else if (data.isActive === false && data.locked === true && data.hyperActive === true && data.checkActive === true) {
//             data.locked = false;

//           } //checked
//           else if (data.isActive === false && data.locked === false && data.hyperActive === true && data.checkActive === true) {
//             data.isActive = true;
//             data.locked = true;
//             data.hyperActive = false;
//             data.checkActive === false
//           }
//           activateAdmin(data._id, data.isActive, data.locked)

//         });
//         masterAgent.forEach((data) => {
//           if (data.isActive === true && data.locked === true && data.masterActive === false && data.checkActive === false) {

//             data.isActive = false;
//             data.locked = false;
//             data.masterActive = true;
//             data.checkActive = true
//           } //checked

//           else if (data.isActive === false && data.locked === true && data.masterActive === true) {
//             data.isActive = false;
//             data.locked = false;
//             data.checkActive = true;

//           }
//           else if (data.isActive === false && data.locked === true && data.masterActive === false && data.checkActive === false) {
//             data.locked = false;
//             data.masterActive = true;

//           } //checked
//           else if (data.isActive === false && data.locked === true && data.masterActive === true && data.checkActive === true) {
//             data.locked = false;

//           } //checked
//           else if (data.isActive === false && data.locked === false && data.masterActive === true && data.checkActive === true) {
//             data.isActive = true;
//             data.locked = true;
//             data.masterActive = false;
//             data.checkActive === false
//           }
//           activateAdmin(data._id, data.isActive, data.locked)

//         });
//         whiteLabel.forEach((data) => {
//           if (data.isActive === true && data.locked === true && data.whiteActive === false && data.checkActive === false) {

//             data.isActive = false;
//             data.locked = false;
//             data.whiteActive = true;
//             data.checkActive = true
//           } //checked

//           else if (data.isActive === false && data.locked === true && data.whiteActive === true) { ///not use
//             data.isActive = false;
//             data.locked = false;
//             data.checkActive = true;

//           }
//           else if (data.isActive === false && data.locked === true && data.whiteActive === false && data.checkActive === false) {
//             data.locked = false;
//             data.whiteActive = true;

//           } //checked
//           else if (data.isActive === false && data.locked === true && data.whiteActive === true && data.checkActive === true) {///not use
//             data.locked = false;

//           } //checked
//           else if (data.isActive === false && data.locked === false && data.whiteActive === true && data.checkActive === true) {
//             data.isActive = true;
//             data.locked = true;
//             data.whiteActive = false;
//             data.checkActive === false
//           }
//           activateAdmin(data._id, data.isActive, data.locked)

//         });
//         subAdmin.forEach((data) => {
//           if (data.isActive === true && data.locked === true && data.subAdminActive === false && data.checkActive === false) {

//             data.isActive = false;
//             data.locked = false;
//             data.subAdminActive = true;
//             data.checkActive = true
//           } //checked

//           else if (data.isActive === false && data.locked === true && data.subAdminActive === true) { ///not use
//             data.isActive = false;
//             data.locked = false;
//             data.checkActive = true;

//           }
//           else if (data.isActive === false && data.locked === true && data.subAdminActive === false && data.checkActive === false) {
//             data.locked = false;
//             data.subAdminActive = true;

//           } //checked
//           else if (data.isActive === false && data.locked === true && data.subAdminActive === true && data.checkActive === true) {///not use
//             data.locked = false;

//           } //checked
//           else if (data.isActive === false && data.locked === false && data.subAdminActive === true && data.checkActive === true) {
//             data.isActive = true;
//             data.locked = true;
//             data.subAdminActive = false;
//             data.checkActive === false
//           }
//           activateAdmin(data._id, data.isActive, data.locked)

//         });


//         // added sub

//         subsuperAgent.forEach((data) => {

//           if (data.isActive === true && data.locked === true && data.subsuperActive === false && data.checkActive === false) {

//             data.isActive = false;
//             data.locked = false;
//             data.subsuperActive = true;
//             data.checkActive = true
//           } //checked

//           else if (data.isActive === false && data.locked === true && data.subsuperActive === true) {
//             data.isActive = false;
//             data.locked = false;
//             data.checkActive = true;

//           }
//           else if (data.isActive === false && data.locked === true && data.superActive === false && data.checkActive === false) {
//             data.locked = false;
//             data.subsuperActive = true;

//           } //checked
//           else if (data.isActive === false && data.locked === true && data.subsuperActive === true && data.checkActive === true) {
//             data.locked = false;

//           } //checked
//           else if (data.isActive === false && data.locked === false && data.subsuperActive === true && data.checkActive === true) {
//             data.isActive = true;
//             data.locked = true;
//             data.subsuperActive = false;
//             data.checkActive === false
//           }
//           activateAdmin(data._id, data.isActive, data.locked)

//         });
//         subhyperAgent.forEach((data) => {
//           if (data.isActive === true && data.locked === true && data.subhyperActive === false && data.checkActive === false) {

//             data.isActive = false;
//             data.locked = false;
//             data.subhyperActive = true;
//             data.checkActive = true
//           } //checked

//           else if (data.isActive === false && data.locked === true && data.subhyperActive === true) {
//             data.isActive = false;
//             data.locked = false;
//             data.checkActive = true;

//           }
//           else if (data.isActive === false && data.locked === true && data.subhyperActive === false && data.checkActive === false) {
//             data.locked = false;
//             data.subhyperActive = true;

//           } //checked
//           else if (data.isActive === false && data.locked === true && data.subhyperActive === true && data.checkActive === true) {
//             data.locked = false;

//           } //checked
//           else if (data.isActive === false && data.locked === false && data.subhyperActive === true && data.checkActive === true) {
//             data.isActive = true;
//             data.locked = true;
//             data.subhyperActive = false;
//             data.checkActive === false
//           }
//           activateAdmin(data._id, data.isActive, data.locked)

//         });
//         submasterAgent.forEach((data) => {
//           if (data.isActive === true && data.locked === true && data.submasterActive === false && data.checkActive === false) {

//             data.isActive = false;
//             data.locked = false;
//             data.submasterActive = true;
//             data.checkActive = true
//           } //checked

//           else if (data.isActive === false && data.locked === true && data.submasterActive === true) {
//             data.isActive = false;
//             data.locked = false;
//             data.checkActive = true;

//           }
//           else if (data.isActive === false && data.locked === true && data.submasterActive === false && data.checkActive === false) {
//             data.locked = false;
//             data.submasterActive = true;

//           } //checked
//           else if (data.isActive === false && data.locked === true && data.submasterActive === true && data.checkActive === true) {
//             data.locked = false;

//           } //checked
//           else if (data.isActive === false && data.locked === false && data.submasterActive === true && data.checkActive === true) {
//             data.isActive = true;
//             data.locked = true;
//             data.submasterActive = false;
//             data.checkActive === false
//           }
//           activateAdmin(data._id, data.isActive, data.locked)

//         });
//         subwhiteLabel.forEach((data) => {
//           if (data.isActive === true && data.locked === true && data.subwhiteActive === false && data.checkActive === false) {

//             data.isActive = false;
//             data.locked = false;
//             data.subwhiteActive = true;
//             data.checkActive = true
//           } //checked

//           else if (data.isActive === false && data.locked === true && data.subwhiteActive === true) { ///not use
//             data.isActive = false;
//             data.locked = false;
//             data.checkActive = true;

//           }
//           else if (data.isActive === false && data.locked === true && data.subwhiteActive === false && data.checkActive === false) {
//             data.locked = false;
//             data.subwhiteActive = true;

//           } //checked
//           else if (data.isActive === false && data.locked === true && data.subwhiteActive === true && data.checkActive === true) {///not use
//             data.locked = false;

//           } //checked
//           else if (data.isActive === false && data.locked === false && data.subwhiteActive === true && data.checkActive === true) {
//             data.isActive = true;
//             data.locked = true;
//             data.subwhiteActive = false;
//             data.checkActive === false
//           }
//           activateAdmin(data._id, data.isActive, data.locked)

//         });

//         await admin.save();
//         await Promise.all(hyperAgent.map(data => data.save()));
//         await Promise.all(masterAgent.map(data => data.save()));
//         await Promise.all(whiteLabel.map(data => data.save()));
//         await Promise.all(superAgent.map(data => data.save()));
//         await Promise.all(subhyperAgent.map(data => data.save()));
//         await Promise.all(submasterAgent.map(data => data.save()));
//         await Promise.all(subwhiteLabel.map(data => data.save()));
//         await Promise.all(subsuperAgent.map(data => data.save()));
//         await Promise.all(subAdmin.map(data => data.save()));
//         return { message: "Admin Locked Successfully" };
//       } else {

//         admin.isActive = false;
//         admin.locked = true;
//         superAgent.forEach((data) => {
//           if (data.isActive === true && data.locked === true && data.superActive === false) {
//             data.isActive = false;
//             data.locked = true;
//             data.superActive = true;
//             data.checkActive = true
//           }
//           else if (data.isActive === false && data.locked === false && data.superActive === true && data.checkActive === false) {
//             data.locked = true;
//             data.superActive = false;
//           }
//           else if (data.isActive === false && data.locked === false && data.superActive === true && data.checkActive === true) {
//             data.locked = true;
//           }
//           activateAdmin(data._id, data.isActive, data.locked)


//         });
//         hyperAgent.forEach((data) => {
//           if (data.isActive === true && data.locked === true && data.hyperActive === false) {
//             data.isActive = false;
//             data.locked = true;
//             data.hyperActive = true;
//             data.checkActive = true
//           }
//           else if (data.isActive === false && data.locked === false && data.hyperActive === true && data.checkActive === false) {
//             data.locked = true;
//             data.hyperActive = false;
//           }
//           else if (data.isActive === false && data.locked === false && data.hyperActive === true && data.checkActive === true) {
//             data.locked = true;
//           }

//           activateAdmin(data._id, data.isActive, data.locked)


//         });
//         masterAgent.forEach((data) => {

//           if (data.isActive === true && data.locked === true && data.masterActive === false) {
//             data.isActive = false;
//             data.locked = true;
//             data.masterActive = true;
//             data.checkActive = true
//           }
//           else if (data.isActive === false && data.locked === false && data.masterActive === true && data.checkActive === false) {
//             data.locked = true;
//             data.masterActive = false;
//           }
//           else if (data.isActive === false && data.locked === false && data.masterActive === true && data.checkActive === true) {
//             data.locked = true;
//           }
//           activateAdmin(data._id, data.isActive, data.locked)


//         });
//         whiteLabel.forEach((data) => {
//           if (data.isActive === true && data.locked === true && data.whiteActive === false) {
//             data.isActive = false;
//             data.locked = true;
//             data.whiteActive = true;
//             data.checkActive = true
//           }
//           else if (data.isActive === false && data.locked === false && data.whiteActive === true && data.checkActive === false) {
//             data.locked = true;
//             data.whiteActive = false;
//           }
//           else if (data.isActive === false && data.locked === false && data.whiteActive === true && data.checkActive === true) {
//             data.locked = true;
//           }
//           activateAdmin(data._id, data.isActive, data.locked)


//         });
//         subAdmin.forEach((data) => {
//           if (data.isActive === true && data.locked === true && data.subAdminActive === false) {
//             data.isActive = false;
//             data.locked = true;
//             data.subAdminActive = true;
//             data.checkActive = true
//           }
//           else if (data.isActive === false && data.locked === false && data.subAdminActive === true && data.checkActive === false) {
//             data.locked = true;
//             data.subAdminActive = false;
//           }
//           else if (data.isActive === false && data.locked === false && data.subAdminActive === true && data.checkActive === true) {
//             data.locked = true;
//           }
//           activateAdmin(data._id, data.isActive, data.locked)


//         });


//         // added sub

//         subsuperAgent.forEach((data) => {
//           if (data.isActive === true && data.locked === true && data.subsuperActive === false) {
//             data.isActive = false;
//             data.locked = true;
//             data.subsuperActive = true;
//             data.checkActive = true
//           }
//           else if (data.isActive === false && data.locked === false && data.subsuperActive === true && data.checkActive === false) {
//             data.locked = true;
//             data.subsuperActive = false;
//           }
//           else if (data.isActive === false && data.locked === false && data.subsuperActive === true && data.checkActive === true) {
//             data.locked = true;
//           }
//           activateAdmin(data._id, data.isActive, data.locked)


//         });
//         subhyperAgent.forEach((data) => {
//           if (data.isActive === true && data.locked === true && data.subhyperActive === false) {
//             data.isActive = false;
//             data.locked = true;
//             data.subhyperActive = true;
//             data.checkActive = true
//           }
//           else if (data.isActive === false && data.locked === false && data.subhyperActive === true && data.checkActive === false) {
//             data.locked = true;
//             data.subhyperActive = false;
//           }
//           else if (data.isActive === false && data.locked === false && data.subhyperActive === true && data.checkActive === true) {
//             data.locked = true;
//           }

//           activateAdmin(data._id, data.isActive, data.locked)


//         });
//         submasterAgent.forEach((data) => {

//           if (data.isActive === true && data.locked === true && data.submasterActive === false) {
//             data.isActive = false;
//             data.locked = true;
//             data.submasterActive = true;
//             data.checkActive = true
//           }
//           else if (data.isActive === false && data.locked === false && data.submasterActive === true && data.checkActive === false) {
//             data.locked = true;
//             data.submasterActive = false;
//           }
//           else if (data.isActive === false && data.locked === false && data.submasterActive === true && data.checkActive === true) {
//             data.locked = true;
//           }
//           activateAdmin(data._id, data.isActive, data.locked)


//         });
//         subwhiteLabel.forEach((data) => {
//           if (data.isActive === true && data.locked === true && data.subwhiteActive === false) {
//             data.isActive = false;
//             data.locked = true;
//             data.subwhiteActive = true;
//             data.checkActive = true
//           }
//           else if (data.isActive === false && data.locked === false && data.subwhiteActive === true && data.checkActive === false) {
//             data.locked = true;
//             data.subwhiteActive = false;
//           }
//           else if (data.isActive === false && data.locked === false && data.subwhiteActive === true && data.checkActive === true) {
//             data.locked = true;
//           }
//           activateAdmin(data._id, data.isActive, data.locked)


//         });

//         await admin.save();
//         await Promise.all(hyperAgent.map(data => data.save()));
//         await Promise.all(masterAgent.map(data => data.save()));
//         await Promise.all(whiteLabel.map(data => data.save()));
//         await Promise.all(superAgent.map(data => data.save()));
//         await Promise.all(subAdmin.map(data => data.save()));
//         await Promise.all(subhyperAgent.map(data => data.save()));
//         await Promise.all(submasterAgent.map(data => data.save()));
//         await Promise.all(subwhiteLabel.map(data => data.save()));
//         await Promise.all(subsuperAgent.map(data => data.save()));

//         return { message: "Admin Suspended Successfully" };
//       }
//     }

//   } catch (err) {
//     throw { code: err.code || 500, message: err.message || "Internal Server Error" };
//   }
// }

export const  syncWithUserBackend = async (req, res) => {
  try {
    const { amount, userId } = req.body;

    const user = await admins.findOne({ where: { adminId: userId } });
    if (!user) {
      return res
        .status(statusCode.badRequest)
        .json(apiResponseErr(null, false, statusCode.badRequest, 'User Not Found'));
    }
    
    
    await admins.update(
      { balance: amount },
      { where: { adminId: userId } },
    );
    
    return res
      .status(statusCode.success)
      .json(apiResponseSuccess(null, true, statusCode.success, 'Balance updated successful'));
  } catch (error) {
    console.error('Error sending balance:', error);
    res
      .status(statusCode.internalServerError)
      .json(apiResponseErr(null, false, statusCode.internalServerError, error.message));
  }
};


