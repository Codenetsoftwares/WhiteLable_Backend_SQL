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
// done
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
        iP: clientIP,
        country: collect.country,
        region: collect.regionName,
        timezone: collect.timezone,
      },
      isActive: admin.isActive,
      locked: admin.locked,
      lastLoginTime: loginTime,
    };
    return res.status(200).json(apiResponseSuccess(responseObj, null, 200, true, 'Data Fetched'));
  } catch (error) {
    res
      .status(500)
      .send(apiResponseErr(error.data ?? null, false, error.responseCode ?? 500, error.errMessage ?? error.message));
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
        [Op.or]: allowedRoles.map(role => fn('JSON_CONTAINS', col('roles'), JSON.stringify({ role }))),
      },
    });

    if (totalRecords === 0) {
      return res.status(404).json(apiResponseErr(null, 404, false, 'No records found'));
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

      try {
        creditRefs = admin.creditRefs ? JSON.parse(admin.creditRefs) : [];
      } catch (error) {
        console.error('Error parsing creditRefs JSON:', error);
      }

      try {
        partnerships = admin.partnerships ? JSON.parse(admin.partnerships) : [];
      } catch (error) {
        console.error('Error parsing partnerships JSON:', error);
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

    return res.status(200).json(
      apiResponseSuccess(
        users,
        true,
        200,
        'Success',
        {
          totalRecords,
          totalPages,
          currentPage: page,
          pageSize,
        }
      ),
    );
  } catch (error) {
    console.error('Error fetching sub admins:', error);
    return res.status(500).json(
      apiResponseErr(error.data ?? null, false, error.responseCode ?? 500, error.errMessage ?? error.message),
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
      return res.status(404).json(apiResponseErr(null, 404, false, 'No records found'));
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

      try {
        creditRefs = admin.creditRefs ? JSON.parse(admin.creditRefs) : [];
      } catch (error) {
        console.error('Error parsing creditRefs JSON:', error);
      }

      try {
        partnerships = admin.partnerships ? JSON.parse(admin.partnerships) : [];
      } catch (error) {
        console.error('Error parsing partnerships JSON:', error);
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

    return res.status(200).json(
      apiResponseSuccess(
        users,
        true,
        200,
        'Success',
        {
          totalRecords,
          totalPages,
          currentPage: page,
          pageSize,
        }
      ),
    );
  } catch (error) {
    console.error('Error fetching sub admins:', error);
    return res.status(500).json(
      apiResponseErr(error.data ?? null, false, error.responseCode ?? 500, error.errMessage ?? error.message),
    );
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
      return res.status(400).json(apiResponseErr(null, false, 400, 'Invalid password'));
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

    return res.status(200).json(apiResponseSuccess({ adminDetails, creditRef: creditRefList }, true, 200, 'CreditRef Edited successfully'));
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
      return res.status(400).json(apiResponseErr(null, false, 400, 'Invalid password'));
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
      return res.status(500).json(apiResponseErr(null, false, 500, 'Invalid partnerships data'));
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

    return res.status(200).json(apiResponseSuccess({ adminDetails, partnerships: partnershipsList }, true, 200, 'Partnership Edit successfully'));
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
      return res.status(500).json(apiResponseErr(null, false, 500, 'Invalid partnerships data'));
    }

    if (!Array.isArray(partnershipsList)) {
      return res.status(400).json(apiResponseErr(null, false, 400, 'partnerships not found or not an array'));
    }

    const last10partnerships = partnershipsList.slice(-10);

    const transferData = {
      partnerships: last10partnerships,
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
      return res.status(500).json(apiResponseErr(null, false, 500, 'Invalid creditRefs data'));
    }

    if (!Array.isArray(creditRefList)) {
      return res.status(404).json(apiResponseErr(null, false, 404, 'creditRefs not found or not an array'));
    }

    const last10creditRefs = creditRefList.slice(-10);

    const transferData = {
      creditRefs: last10creditRefs,
      userName: admin.userName,
    };

    return res.status(200).json(apiResponseSuccess(transferData, 200, true, 'Success'));
  } catch (error) {
    return res.status(500).send(apiResponseErr(error.data ?? null, false, error.responseCode ?? 500, error.errMessage ?? error.message));
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
    return res.status(200).json(apiResponseSuccess(active, null, 200, true, 'successfully'));
  } catch (error) {
    res
      .status(500)
      .send(apiResponseErr(error.data ?? null, false, error.responseCode ?? 500, error.errMessage ?? error.message));
  }
};
// done
export const profileView = async (req, res) => {
  try {
    const userName = req.params.userName;
    const admin = await admins.findOne({ where: { userName } });
    if (!admin) {
      return res.status(400).json(apiResponseErr(null, 400, false, 'Admin Not Found'));
    }
    const transferData = {
      adminId: admin.adminId,
      roles: admin.roles,
      userName: admin.userName,
    };
    return res.status(200).json(apiResponseSuccess(transferData, null, 200, true, 'successfully'));
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

    if (!globalUsernames) {
      globalUsernames = [];
    }

    if (!userName) {
      return res.status(400).json(apiResponseErr(null, false, 400, 'userName parameter is required'));
    }

    const user = await admins.findOne({ where: { userName } });

    if (!user) {
      return res.status(400).json(apiResponseErr(null, false, 400, 'User not found'));
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
        },
      });

      const totalPages = Math.ceil(totalRecords / pageSize);

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
            status: createdUser.isActive ? 'active' : createdUser.locked ? 'locked' : 'suspended',
          };
        }),
      };

      const message = 'Path stored successfully';
      return res.status(201).json(
        apiResponseSuccess(
          {
            path: globalUsernames,
            userDetails,
            page,
            pageSize,
            totalPages,
          },
          true,
          201,
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
      throw { code: 400, message: 'Invalid action provided' };
    }

    await user.update({ path: JSON.stringify(globalUsernames) });

    const successMessage = action === 'store' ? 'Path stored successfully' : 'Path cleared successfully';
    return res.status(200).json(
      apiResponseSuccess({ path: globalUsernames, page, pageSize, totalPages: 1 }, true, 200, successMessage)
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
