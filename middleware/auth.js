import jwt from 'jsonwebtoken';
import { database } from '../dbConnection/database.service.js';
import { apiResponseErr } from '../helper/errorHandler.js';
import { Long } from 'mongodb';
import { statusCode } from '../helper/statusCodes.js';

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

      const [rows] = await database.execute('SELECT * FROM Admins WHERE adminId = ?', [user.adminId]);

      const existingUser = rows[0];

      if (!existingUser) {
        return res.status(statusCode.unauthorize).json(apiResponseErr(null, false, statusCode.unauthorize, 'Unauthorized access'));
      }

      const userRoles = existingUser.roles;
      if (!existingUser.isActive && !existingUser.locked) {
        return res.status(423).json(apiResponseErr(null, false, 423, 'Account is inactive or locked'));
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
