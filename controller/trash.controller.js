import { apiResponseErr, apiResponseSuccess, apiResponsePagination } from '../helper/errorHandler.js';
import admins from '../models/admin.model.js';
import { v4 as uuidv4 } from 'uuid';
import trash from '../models/trash.model.js';
import { statusCode } from '../helper/statusCodes.js';

export const moveAdminToTrash = async (req, res) => {
  try {
    const { requestId } = req.body;

    const admin = await admins.findOne({ where: { adminId: requestId } });

    if (!admin) {
      return res.status(statusCode.notFound).json(apiResponseErr(null, false, statusCode.notFound, `Admin User not found with id: ${requestId}`));
    }

    if (admin.balance !== 0) {
      return res
        .status(statusCode.badRequest)
        .json(apiResponseErr(null, false, statusCode.badRequest, `Balance should be 0 to move the Admin User to Trash`));
    }

    if (!admin.isActive) {
      return res.status(statusCode.badRequest).json(apiResponseErr(null, false, statusCode.badRequest, `Admin is inactive or locked`));
    }

    const updatedTransactionData = {
      adminId: admin.adminId,
      roles: admin.roles || [],
      userName: admin.userName,
      password: admin.password,
      balance: admin.balance || 0,
      loadBalance: admin.loadBalance || 0,
      creditRefs: admin.creditRefs || [],
      partnerships: admin.partnerships || [],
      createdById: admin.createdById || '',
      createdByUser: admin.createdByUser || '',
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
      return res.status(statusCode.internalServerError).json(apiResponseErr(null, statusCode.internalServerError, false, `Failed to backup Admin User`));
    }

    // Delete the admin user from the Admins table
    const deleteResult = await admin.destroy();

    if (!deleteResult) {
      return res
        .status(statusCode.internalServerError)
        .json(apiResponseErr(null, statusCode.internalServerError, false, `Failed to delete Admin User with id: ${requestId}`));
    }

    return res.status(statusCode.create).json(apiResponseSuccess(null, statusCode.create, true, 'Admin User moved to Trash'));
  } catch (error) {
    console.error('Error in moveAdminToTrash:', error);
    res
      .status(statusCode.internalServerError)
      .send(apiResponseErr(error.data ?? null, false, error.responseCode ?? statusCode.internalServerError, error.errMessage ?? error.message));
  }
};

export const viewTrash = async (req, res) => {
  try {
    const viewTrash = await trash.findAll();
    if (!viewTrash || viewTrash.length === 0) {
      return res.status(statusCode.notFound).json(apiResponseErr(null, false, statusCode.notFound, 'No entries found in Trash'));
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

    // Delete the user from the trash table
    const deleteResult = await existingAdminUser.destroy();

    if (!deleteResult) {
      return res
        .status(statusCode.badRequest)
        .json(apiResponseErr(null, statusCode.badRequest, false, `Failed to delete Admin User from Trash with adminId: ${adminId}`));
    }

    return res.status(statusCode.create).json(apiResponseSuccess(null, statusCode.create, true, 'Admin restored from trash successfully!'));
  } catch (error) {
    res
      .status(statusCode.internalServerError)
      .send(apiResponseErr(error.data ?? null, false, error.responseCode ?? statusCode.internalServerError, error.errMessage ?? error.message));
  }
};
