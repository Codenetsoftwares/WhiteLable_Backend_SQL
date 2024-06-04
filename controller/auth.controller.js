import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import admins from '../models/admin.model.js';
import { apiResponseErr, apiResponseSuccess } from '../helper/errorHandler.js';


export const generateAdminAccessToken = async (req, res) => {
    try {
        const { userName, password, persist } = req.body;

        const existingAdmin = await admins.findOne({ where: { userName } });
        if (!existingAdmin) {
            const subAdminUser = await SubAdmin.findOne({ where: { userName } });
            if (!subAdminUser) {
                return res.status(400).json(apiResponseErr(null, 400, false, 'Invalid User Name or password'));
            }
            //   if (!subAdminUser.locked) {
            //     return res.status(400).json(apiResponseErr(null, 400, false, `${subAdminUser.userName} Account is Locked`));
            //   }
            const passwordValid = await bcrypt.compare(password, subAdminUser.password);
            if (!passwordValid) {
                return res.status(400).json(apiResponseErr(null, 400, false, 'Invalid password'));
            }
            const accessTokenResponse = {
                subAdminId: subAdminUser.subAdminId,
                createdById: subAdminUser.createdById,
                createdByUser: subAdminUser.createdByUser,
                userName: subAdminUser.userName,
                roles: subAdminUser.roles.map((role) => ({
                    role: role.role,
                    permission: role.permission,
                })),
                Status: subAdminUser.isActive
                    ? 'Active'
                    : !subAdminUser.locked
                        ? 'Locked'
                        : !subAdminUser.isActive
                            ? 'Suspended'
                            : '',
            };
            const accessToken = jwt.sign(accessTokenResponse, process.env.JWT_SECRET_KEY, {
                expiresIn: persist ? '1y' : '8h',
            });
            const loginTime = new Date();
            await subAdminUser.update({ lastLoginTime: loginTime });
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
            //   if (!existingAdmin.locked) {
            //     return res.status(400).json(apiResponseErr(null, 400, false, `${existingAdmin.userName} Account is Locked`));
            //   }
            const passwordValid = await bcrypt.compare(password, existingAdmin.password);
            if (!passwordValid) {
                return res.status(400).json(apiResponseErr(null, 400, false, 'Invalid password'));
            }
            const accessTokenResponse = {
                adminId: existingAdmin.adminId,
                createdById: existingAdmin.createdById,
                createdByUser: existingAdmin.createdByUser,
                userName: existingAdmin.userName,
                roles: existingAdmin.roles.map((role) => ({
                    role: role.role,
                    permission: role.permission,
                })),
                Status: existingAdmin.isActive
                    ? 'Active'
                    : !existingAdmin.locked
                        ? 'Locked'
                        : !existingAdmin.isActive
                            ? 'Suspended'
                            : '',
            };
            const accessToken = jwt.sign(accessTokenResponse, process.env.JWT_SECRET_KEY, {
                expiresIn: persist ? '1y' : '8h',
            });
            const loginTime = new Date();
            await existingAdmin.update({ lastLoginTime: loginTime });
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

export const adminPasswordResetCode = async (req, res) => {
    try {
      const { userName, oldPassword, password } = req.body;
      const existingUser = await admins.findOne({ where: { userName } });
      if (!existingUser) {
        return res.status(400).json(apiResponseErr(null, 400, false, 'Admin not found'));
      }
      if (!existingUser.isActive || !existingUser.locked) {
        return res.status(400).json(apiResponseErr(null, 400, false, 'Account is Not Active'));
      }
      const oldPasswordIsCorrect = await bcrypt.compare(oldPassword, existingUser.password);
      if (!oldPasswordIsCorrect) {
        return res.status(400).json(apiResponseErr(null, 401, false, 'Invalid old password'));
      }
      const passwordIsDuplicate = await bcrypt.compare(password, existingUser.password);
      if (passwordIsDuplicate) {
        return res.status(400).json(apiResponseErr(null, 409, false, 'New Password Cannot Be The Same As Existing Password'));
      }
      const passwordSalt = await bcrypt.genSalt();
      const encryptedPassword = await bcrypt.hash(password, passwordSalt);
      await admins.update({ password: encryptedPassword }, { where: { userName } });
      return res.status(201).json(apiResponseSuccess(null, 201, true, 'Password Reset Successful!'));
    } catch (error) {
      res.status(500).send(apiResponseErr(error.data ?? null, false, error.responseCode ?? 500, error.errMessage ?? error.message));
    }
  };
  
