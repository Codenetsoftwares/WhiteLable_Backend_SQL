import jwt from 'jsonwebtoken';
import { apiResponseErr } from '../helper/errorHandler.js';
import { statusCode } from '../helper/statusCodes.js';
import admins from '../models/admin.model.js';

export const Authorize = (roles) => {
  return async (req, res, next) => {
    try {
      const authToken = req.headers.authorization;

      if (!authToken) {
        return res.status(statusCode.unauthorize).json(apiResponseErr(null, false, statusCode.unauthorize, 'Invalid login attempt (1)'));
      }

      const tokenParts = authToken.split(' ');
      if (tokenParts.length !== 2 || !(tokenParts[0] === 'Bearer' && tokenParts[1])) {
        return res.status(statusCode.unauthorize).json(apiResponseErr(null, false, statusCode.unauthorize, 'Invalid login attempt (2)'));
      }

      const user = jwt.verify(tokenParts[1], process.env.JWT_SECRET_KEY);

      if (!user) {
        return res.status(statusCode.unauthorize).json(apiResponseErr(null, false, statusCode.unauthorize, 'Invalid login attempt (3)'));
      }

      const existingUser = await admins.findOne({ where: { adminId: user.adminId } });
      

      if (!existingUser) {
        return res.status(statusCode.unauthorize).json(apiResponseErr(null, false, statusCode.unauthorize, 'Unauthorized access'));
      }

      const userRoles = existingUser.roles;
      if (existingUser.locked === false) {
        return res.status(statusCode.unauthorize).json(apiResponseErr(null, false, statusCode.unauthorize, 'Account is locked'));
      }

      if(existingUser.token !== tokenParts[1]) {
        return res
          .status(statusCode.unauthorize)
          .send(apiResponseErr(null, false, statusCode.unauthorize, 'Unauthorized access'));
      }

      if (roles && roles.length > 0) {
        let userHasRequiredRole = false;
        let userHasRequiredPermission = false;

        roles.forEach((role) => {
          userRoles.forEach((userRole) => {
            if (userRole.role === role || (Array.isArray(userRole.permission) && userRole.permission.includes(role))) {
              userHasRequiredRole = true;
              userHasRequiredPermission = true;
            }
          });
        });

        if (!userHasRequiredRole && !userHasRequiredPermission) {
          return res.status(statusCode.unauthorize).json(apiResponseErr(null, false, statusCode.unauthorize, 'Unauthorized access'));
        }
      }

      req.user = existingUser;
      next();
    } catch (err) {
      console.error('Authorization Error:', err.message);
      return res.status(statusCode.unauthorize).json(apiResponseErr(null, false, statusCode.unauthorize, 'Unauthorized access'));
    }
  };
};
