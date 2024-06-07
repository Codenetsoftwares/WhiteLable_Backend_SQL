import jwt from 'jsonwebtoken';
import { database } from '../dbConnection/database.service.js';
import { apiResponseErr } from '../helper/errorHandler.js';

export const roleAuth = (requiredRoles) => {
    return async (req, res, next) => {
        try {
            const authToken = req.headers.authorization;

            if (!authToken) {
                return res.status(401).json(apiResponseErr(null, 401, false, 'Invalid login attempt (1)'));
            }

            const tokenParts = authToken.split(' ');
            if (tokenParts.length !== 2 || !(tokenParts[0] === 'Bearer' && tokenParts[1])) {
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

            if (!existingUser.isActive && !existingUser.locked) {
                return res.status(423).json(apiResponseErr(null, 423, false, 'Account is inactive or locked'));
            }

            const userRoles = existingUser.roles;
            if (requiredRoles && requiredRoles.length > 0) {
                const userHasRequiredRole = requiredRoles.some(role => userRoles.includes(role));

                if (!userHasRequiredRole) {
                    return res.status(401).json(apiResponseErr(null, 401, false, 'Unauthorized access'));
                }
            }

            req.user = existingUser;
            next();
        } catch (err) {
            console.error('Authorization Error:', err.message);
            return res.status(401).json(apiResponseErr(null, 401, false, 'Unauthorized access'));
        }
    };
};
