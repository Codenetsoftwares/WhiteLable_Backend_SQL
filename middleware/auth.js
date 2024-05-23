import jwt from 'jsonwebtoken';
import { database } from "../dbConnection/database.service.js"
import { apiResponseErr } from '../helper/errorHandler.js';
import { Long } from 'mongodb';

export const Authorize = (roles) => {
  return async (req, res, next) => {
    try {
      const authToken = req.headers.authorization;

      if (!authToken) {
return res.status(401).json(apiResponseErr(null, 401, false, 'Invalid login attempt (1)'));
        
      }

      const tokenParts = authToken.split(" ");
      if (
        tokenParts.length !== 2 ||
        !(tokenParts[0] === "Bearer" && tokenParts[1])
      ) {
          return res.status(401).json(apiResponseErr(null, 401, false, 'Invalid login attempt (2)'));
      }

      const user = jwt.verify(tokenParts[1], process.env.JWT_SECRET_KEY);
      
      if (!user) {
          return res.status(401).json(apiResponseErr(null, 401, false, 'Invalid login attempt (3)'));
      }

      const [rows] = await database.execute('SELECT * FROM Admins WHERE adminId = ?', [user.adminId]);

      const existingUser = rows[0];
     
      if (!existingUser) {
          return res.status(401).json(apiResponseErr(null, 401, false, 'Unauthorized access'));
      }

      const userRoles = existingUser.roles;
      if (!existingUser.isActive && !existingUser.locked) {
          return res.status(423).json(apiResponseErr(null, 423, false, 'Account is inactive or locked'));
      }

      if (roles && roles.length > 0) {
        let userHasRequiredRole = false;
        let userHasRequiredPermission = false;

        roles.forEach((role) => {
          userRoles.forEach((userRole) => {
            if (
              userRole.role === role || (Array.isArray(userRole.permission) && userRole.permission.includes(role))
            ) {
              userHasRequiredRole = true;
              userHasRequiredPermission = true;
            }
          });
        });

        if (!userHasRequiredRole && !userHasRequiredPermission) {
            return res.status(401).json(apiResponseErr(null, 401, false, 'Unauthorized access'));
        }
      }

      req.user = existingUser;
      next();
    } catch (err) {
      console.error("Authorization Error:", err.message);
      return res.status(401).json(apiResponseErr(null, 401, false, 'Unauthorized access'));
        
    }
  };
};
