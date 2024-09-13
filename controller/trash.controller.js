import { apiResponseErr, apiResponseSuccess, apiResponsePagination } from '../helper/errorHandler.js';
import admins from '../models/admin.model.js';
import { v4 as uuidv4 } from 'uuid';
import trash from '../models/trash.model.js';
import { statusCode } from '../helper/statusCodes.js';
import axios from 'axios';
import { string } from '../constructor/string.js';

export const moveAdminToTrash = async (req, res) => {
  try {
    const { requestId } = req.body;

    const adminId = await admins.findOne({ where: { adminId: requestId } });
     
    if (!adminId) {
      return res.status(statusCode.badRequest).json(apiResponseErr(null, false, statusCode.badRequest, `Admin User not found with id: ${requestId}`));
    }

    if (adminId.balance !== 0) {
      return res
        .status(statusCode.badRequest)
        .json(apiResponseErr(null, false, statusCode.badRequest, `Balance should be 0 to move the Admin User to Trash`));
    }

    if (!adminId.isActive) {
      return res.status(statusCode.badRequest).json(apiResponseErr(null, false, statusCode.badRequest, `Admin is inactive or locked`));
    }

    const updatedTransactionData = {
      adminId: adminId.adminId,
      roles: adminId.roles || [],
      userName: adminId.userName,
      password: adminId.password,
      balance: adminId.balance || 0,
      loadBalance: adminId.loadBalance || 0,
      creditRefs: adminId.creditRefs || [],
      partnerships: adminId.partnerships || [],
      createdById: adminId.createdById || '',
      createdByUser: adminId.createdByUser || '',
    };

    const trashEntry = await trash.create({
      trashId: uuidv4(),
      roles: updatedTransactionData.roles,
      userName: updatedTransactionData.userName,
      password: updatedTransactionData.password,
      balance: updatedTransactionData.balance,
      loadBalance: updatedTransactionData.loadBalance,
      creditRefs: updatedTransactionData.creditRefs,
      partnerships: updatedTransactionData.partnerships,
      createdById: updatedTransactionData.createdById,
      adminId: updatedTransactionData.adminId,
      createdByUser: updatedTransactionData.createdByUser,
    });

    if (!trashEntry) {
      return res.status(statusCode.badRequest).json(apiResponseErr(null, statusCode.badRequest, false, `Failed to backup Admin User`));
    }

    const deleteResult = await adminId.destroy();
    
    if (!deleteResult) {
      return res.status(statusCode.badRequest).json(apiResponseErr(null, statusCode.badRequest, false, `Failed to delete Admin User with id: ${requestId}`));
    }
    
    // sync with colorgame user
    let message = '';
    if (adminId.roles[0].role === string.user) {
      const dataToSend = {
        userId: requestId,
      };

      const { data: response } = await axios.post('https://cg.server.dummydoma.in/api/extrernal/trash-user', dataToSend);
      if (!response.success) {
        message = 'Failed to move user data to trash';
      } else {
        message = "successfully";
      }
    }

    return res.status(statusCode.success).json(apiResponseSuccess(null, statusCode.success, true, 'Admin User moved to Trash' + " " + message));
  } catch (error) {
    console.error('Error in moveAdminToTrash:', error);
    res
      .status(statusCode.internalServerError)
      .send(apiResponseErr(error.data ?? null, false, error.responseCode ?? statusCode.internalServerError, error.errMessage ?? error.message));
  }
};

export const viewTrash = async (req, res) => {
  try {
    const adminId = req.params.createdById;
    const viewTrash = await trash.findAll({where:{createdById:adminId}});
    if (!viewTrash || viewTrash.length === 0) {
      return res.status(statusCode.success).json(apiResponseSuccess([], true, statusCode.success, 'No entries found in Trash'));
    }
    return res.status(statusCode.success).json(apiResponseSuccess(viewTrash, true, statusCode.success, 'successfully'));
  } catch (error) {
    res
      .status(statusCode.internalServerError)
      .send(apiResponseErr(error.data ?? null, false, error.responseCode ?? statusCode.internalServerError, error.errMessage ?? error.message));
  }
};

export const deleteTrashData = async (req, res) => {
  try {
    const trashId = req.params.trashId;
    const record = await trash.findOne({ where: { trashId } });
    if (!record) {
      return res.status(statusCode.notFound).json(apiResponseErr('Data not found', false, statusCode.notFound, 'Data not found'));
    }
    await record.destroy();
    return res.status(statusCode.success).json(apiResponseSuccess(null, true, statusCode.success, 'Data deleted successfully'));
  } catch (error) {
    console.error('Error in deleteTrashData:', error);
    res
      .status(statusCode.internalServerError)
      .send(apiResponseErr(error.data ?? null, false, error.responseCode ?? statusCode.internalServerError, error.errMessage ?? error.message));
  }
};

export const restoreAdminUser = async (req, res) => {
  try {
    const { adminId } = req.body;
    const existingAdminUser = await trash.findOne({ where: { adminId } });

    if (!existingAdminUser) {
      return res.status(statusCode.notFound).json(apiResponseErr(null, false, statusCode.notFound, 'Admin not found in trash'));
    }

    const restoreRemoveData = {
      roles: existingAdminUser.roles,
      userName: existingAdminUser.userName,
      password: existingAdminUser.password,
      balance: existingAdminUser.balance,
      loadBalance: existingAdminUser.loadBalance,
      creditRefs: existingAdminUser.creditRefs,
      partnerships: existingAdminUser.partnerships,
      createdById: existingAdminUser.createdById,
      adminId: existingAdminUser.adminId,
      createdByUser: existingAdminUser.createdByUser,
    };

    const restoreResult = await admins.create(restoreRemoveData);

    if (!restoreResult) {
      return res.status(statusCode.badRequest).json(apiResponseErr(null, statusCode.badRequest, false, 'Failed to restore Admin User'));
    }

    const deleteResult = await existingAdminUser.destroy();

    if (!deleteResult) {
      return res.status(statusCode.badRequest).json(apiResponseErr(null, statusCode.badRequest, false, `Failed to delete Admin User from Trash with adminId: ${adminId}`));
    }
    
    // sync with colorgame user
    let message = '';
    if (existingAdminUser.roles[0].role === string.user) {
    const dataToSend = {
      userId : adminId,
    };
   
    const { data: response }  = await axios.post('https://cg.server.dummydoma.in/api/extrernal/restore-trash-user', dataToSend);

    if(!response.success) {
      message = 'Failed restored user';
    } else {
      message = "successfully";
    }
  }
    return res.status(statusCode.success).json(apiResponseSuccess(null, statusCode.success, true, 'Admin restored from trash' + " " + message));
  } catch (error) {
    res
      .status(statusCode.internalServerError)
      .send(apiResponseErr(error.data ?? null, false, error.responseCode ?? statusCode.internalServerError, error.errMessage ?? error.message));
  }
};
