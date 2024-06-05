import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import admins from '../models/admin.model.js';
import { apiResponseErr, apiResponseSuccess } from '../helper/errorHandler.js';
import { string } from '../constructor/string.js';

// done
export const adminLogin = async (req, res) => {
    try {
        const { userName, password, persist } = req.body;

        const existingAdmin = await admins.findOne({ where: { userName } });

        if (!existingAdmin) {
            return res.status(400).json(apiResponseErr(null, 400, false, 'Invalid User Name or password'));
        }

        const passwordValid = await bcrypt.compare(password, existingAdmin.password);
        if (!passwordValid) {
            return res.status(400).json(apiResponseErr(null, 400, false, 'Invalid password'));
        }

        let adminIdToSend;
        const roles = existingAdmin.roles.map((role) => role.role);
        
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
        };

        const accessToken = jwt.sign(accessTokenResponse, process.env.JWT_SECRET_KEY, {
            expiresIn: persist ? '1y' : '8h',
        });

        const loginTime = new Date();
        await existingAdmin.update({ lastLoginTime: loginTime });

        return res.status(200).send(
            apiResponseSuccess(
                { token: accessToken, adminData: accessTokenResponse },
                true,
                200,
                'Admin login successfully',
            ),
        );
    } catch (error) {
        res.status(500).send(apiResponseErr(error.data ?? null, false, error.responseCode ?? 500, error.errMessage ?? error.message));
    }
};
// done
export const adminPasswordResetCode = async (req, res) => {
    try {
        const { userName, oldPassword, password } = req.body;
        const existingUser = await admins.findOne({ where: { userName } });
        if (!existingUser) {
            return res.status(400).json(apiResponseErr(null, 400, false, 'Admin not found'));
        }
        //   if (!existingUser.isActive || !existingUser.locked) {
        //     return res.status(400).json(apiResponseErr(null, 400, false, 'Account is Not Active'));
        //   }
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
        return res.status(200).json(apiResponseSuccess(null, true, 200, 'Password Reset Successful!'));
    } catch (error) {
        res.status(500).send(apiResponseErr(error.data ?? null, false, error.responseCode ?? 500, error.errMessage ?? error.message));
    }
};

