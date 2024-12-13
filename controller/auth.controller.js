import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import admins from '../models/admin.model.js';
import { apiResponseErr, apiResponseSuccess } from '../helper/errorHandler.js';
import { messages, string } from '../constructor/string.js';
import { statusCode } from '../helper/statusCodes.js';
import CustomError from '../helper/extendError.js';

// done
export const adminLogin = async (req, res) => {
    try {
        const { userName, password, persist } = req.body;

        const existingAdmin = await admins.findOne({ where: { userName } });

        if (!existingAdmin) {
            return res.status(statusCode.badRequest).send(apiResponseErr(null, false, statusCode.badRequest, 'Admin doesn`t exist'));
        }

        if (existingAdmin.locked === false) {
            await existingAdmin.update({ loginStatus: 'login failed' });
            throw new CustomError('Account is locked', null, statusCode.badRequest);
        }
        
        const roles = existingAdmin.roles.map((role) => role.role);
        if (roles.includes('user')) {
            await existingAdmin.update({ loginStatus: 'login failed' });
            return res.status(statusCode.unauthorize).send(apiResponseErr(null, false, statusCode.unauthorize, 'User does not exist'));
        }
        const passwordValid = await bcrypt.compare(password, existingAdmin.password);
        if (!passwordValid) {
            await existingAdmin.update({ loginStatus: 'login failed' });
            return res.status(statusCode.badRequest).send(apiResponseErr(null, false, statusCode.badRequest, messages.invalidPassword));
        }
        if (existingAdmin.isReset === true) {
            const resetTokenResponse = {
              id: null,
              userName: null,
              isEighteen: null,
              userType: null,
              wallet: null,
              isReset: existingAdmin.isReset,
            };
            return res
        .status(statusCode.success)
        .send(
          apiResponseSuccess(
            {
              ...resetTokenResponse,
            },
            true,
            statusCode.success,
            'Password reset required.',
          ),
        );
        }
        else {
            let adminIdToSend;
  
            if ([string.superAdmin, string.whiteLabel, string.hyperAgent, string.superAgent].includes(roles[0])) {
                adminIdToSend = existingAdmin.adminId;
            } else if ([string.subWhiteLabel, string.subAdmin, string.subHyperAgent, string.subSuperAgent, string.subMasterAgent].includes(roles[0])) {
                adminIdToSend = existingAdmin.createdById;
            } else {
                adminIdToSend = existingAdmin.adminId;
            }
    
            const accessTokenResponse = {
                adminId: adminIdToSend,
                createdById: existingAdmin.createdById,
                createdByUser: existingAdmin.createdByUser,
                userName: existingAdmin.userName,
                roles: existingAdmin.roles.map((role) => ({
                    role: role.role,
                    permission: role.permission,
                })),
                status: existingAdmin.isActive
                    ? 'active'
                    : !existingAdmin.locked
                        ? 'locked'
                        : !existingAdmin.isActive
                            ? 'suspended'
                            : '',
                accessToken: jwt.sign({
                    adminId: adminIdToSend,
                    createdById: existingAdmin.createdById,
                    createdByUser: existingAdmin.createdByUser,
                    userName: existingAdmin.userName,
                    roles: existingAdmin.roles.map((role) => ({
                        role: role.role,
                        permission: role.permission,
                    })),
                    status: existingAdmin.isActive
                        ? 'active'
                        : !existingAdmin.locked
                            ? 'locked'
                            : !existingAdmin.isActive
                                ? 'suspended'
                                : '',
                }, process.env.JWT_SECRET_KEY, {
                    expiresIn: persist ? '1y' : '8h',
                })
            };

            const accessToken = jwt.sign(accessTokenResponse, process.env.JWT_SECRET_KEY, {
                expiresIn: '1d',
              });
        
            existingAdmin.token = accessToken

    console.log("existingAdmin.token...",existingAdmin.token)
            const loginTime = new Date();

            await existingAdmin.update({ lastLoginTime: loginTime, loginStatus: 'login success' });
            await existingAdmin.save()

            return res.status(statusCode.success).send(
                apiResponseSuccess(
                    {accessToken, ...accessTokenResponse},
                    true,
                    statusCode.success,
                    'Admin login successfully',
                ),
            );
          }
      
    } catch (error) {
        res.status(statusCode.internalServerError).send(apiResponseErr(error.data ?? null, false, error.responseCode ?? statusCode.internalServerError, error.errMessage ?? error.message));
    }
};

// done
// export const adminPasswordResetCode = async (req, res) => {
//     try {
//         const { userName, adminPassword, password } = req.body;
//         const existingUser = await admins.findOne({ where: { userName } });
//         if (!existingUser) {
//             return res.status(statusCode.badRequest).json(apiResponseErr(null, false, statusCode.badRequest, messages.adminNotFound));
//         }
//         //   if (!existingUser.isActive || !existingUser.locked) {
//         //     return res.status(statusCode.badRequest).json(apiResponseErr(null, false, statusCode.badRequest, 'Account is Not Active'));
//         //   }
//         // const oldPasswordIsCorrect = await bcrypt.compare(oldPassword, existingUser.password);
//         // if (!oldPasswordIsCorrect) {
//         //     return res.status(statusCode.badRequest).json(apiResponseErr(null, false, statusCode.badRequest, 'Invalid old password'));
//         // }
//         const passwordIsDuplicate = await bcrypt.compare(password, existingUser.password);
//         if (passwordIsDuplicate) {
//             return res.status(statusCode.badRequest).json(apiResponseErr(null, false, statusCode.badRequest, 'New Password Cannot Be The Same As Existing Password'));
//         }
//         const passwordSalt = await bcrypt.genSalt();
//         const encryptedPassword = await bcrypt.hash(password, passwordSalt);
//         await admins.update({ password: encryptedPassword }, { where: { userName } });
//         return res.status(statusCode.success).json(apiResponseSuccess(null, true, statusCode.success, 'Password Reset Successful!'));
//     } catch (error) {
//         res.status(statusCode.internalServerError).send(apiResponseErr(error.data ?? null, false, error.responseCode ?? statusCode.internalServerError, error.errMessage ?? error.message));
//     }
// };

export const adminPasswordResetCode = async (req, res) => {
    try {

        const admin = req.user
        const { userName, adminPassword, password } = req.body;
        const existingUser = await admins.findOne({ where: { userName } });
        if (!existingUser) {
            return res.status(statusCode.badRequest).send(apiResponseErr(null, false, statusCode.badRequest, messages.adminNotFound));
        }
        if (admin.adminId !== existingUser.createdById) {

            return res.status(statusCode.badRequest).send(apiResponseErr(null, false, statusCode.badRequest, 'Admin Does not have permission to reset Password'));
        }
        const isAdminPasswordCorrect = await bcrypt.compare(adminPassword, admin.password);
        if (!isAdminPasswordCorrect) {
            return res.status(statusCode.badRequest).send(apiResponseErr(null, false, statusCode.badRequest, 'Invalid Admin password'));
        }
        const passwordIsDuplicate = await bcrypt.compare(password, existingUser.password);
        if (passwordIsDuplicate) {
            return res.status(statusCode.badRequest).send(apiResponseErr(null, false, statusCode.badRequest, 'New Password Cannot Be The Same As Existing Password'));
        }
        const passwordSalt = await bcrypt.genSalt();
        const encryptedPassword = await bcrypt.hash(password, passwordSalt);
        await admins.update({ password: encryptedPassword }, { where: { userName } });

        return res.status(statusCode.success).send(apiResponseSuccess(existingUser, true, statusCode.success, 'Password Reset Successful!'));
    } catch (error) {
        res.status(statusCode.internalServerError).send(apiResponseErr(null, false, statusCode.internalServerError, error.message));
    }
};


export const resetPassword = async (req, res) => {
    try {
        const { userName, oldPassword } = req.body;

        const existingAdmin = await admins.findOne({ where: { userName } });

        if (!existingAdmin) {
            return res.status(statusCode.badRequest).json(apiResponseErr(null, false, statusCode.badRequest, 'Invalid User Name or password'));
        }

        const passwordValid = await bcrypt.compare(oldPassword, existingAdmin.password);

        if (!passwordValid) {
            return res.status(statusCode.badRequest).json(apiResponseErr(null, false, statusCode.badRequest, messages.invalidPassword));
        }

        const result = {
            userId: existingAdmin.adminId,
            userName: existingAdmin.userName,
            balance: existingAdmin.balance,
            authenticate: true
        }

        return res.status(statusCode.success).send(
            apiResponseSuccess(
                result,
                true,
                statusCode.success,
                'Authenticate true',
            ),
        );
    } catch (error) {
        res.status(statusCode.internalServerError).send(apiResponseErr(error.data ?? null, false, error.responseCode ?? statusCode.internalServerError, error.errMessage ?? error.message));
    }
};

export const loginResetPassword = async (req, res) => {
    try {
      const { userName, oldPassword, newPassword } = req.body;
  
      const existingUser = await admins.findOne({ where: { userName } });
      console.log('existingUser', existingUser)
  
      const isPasswordMatch = await bcrypt.compare(oldPassword, existingUser.password);
      if (!isPasswordMatch) {
        return res.status(statusCode.badRequest).send(apiResponseErr(null, false, statusCode.badRequest, 'Invalid old password.'));
      }
      console.log('existingUser', existingUser)
  
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);
  
      await existingUser.update({ password: hashedPassword, isReset: false });
  
      return res.status(statusCode.success).send(apiResponseSuccess(null, true, statusCode.success, 'Password reset successfully.'));
    } catch (error) {
      console.error('Error resetting password:', error);
      res.status(statusCode.internalServerError).send(apiResponseErr(error.data ?? null, false, error.responseCode ?? statusCode.internalServerError, error.errMessage ?? error.message));
    }
  };

