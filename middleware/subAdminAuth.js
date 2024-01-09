import jwt from "jsonwebtoken";
import { SubAdmin } from '../models/subAdmin.model.js'
import { User } from "../models/user.model.js";

export const AuthorizeSubAdmin = (roles) => {
  return async (req, res, next) => {
    try {
      const authToken = req.headers.authorization;

      if (!authToken) {  
        return res
          .status(401)
          .send({ code: 401, message: "Invalid login attempt (1)" });
      }

      const tokenParts = authToken.split(" ");
      if (
        tokenParts.length !== 2 ||
        !(tokenParts[0] === "Bearer" && tokenParts[1])
      ) {
        return res
          .status(401)
          .send({ code: 401, message: "Invalid login attempt (2)" });
      }

      const user = jwt.verify(tokenParts[1], process.env.JWT_SECRET_KEY); 
      if (!user) {
        return res
          .status(401)
          .send({ code: 401, message: "Invalid login attempt (3)" });
      }

      let existingUser;
      
      if (roles.includes("SubAdmin")) {
        existingUser = await SubAdmin.findById(user.id).exec();
        if (!existingUser) {
          return res.status(401).send({
            code: 401,
            message: "Invalid login attempt for admin (2)",
          });
        }
      }

      if (roles.includes("SubWhiteLabel")) {
        existingUser = await SubAdmin.findById(user.id).exec();
        if (!existingUser) {
          return res.status(401).send({
            code: 401,
            message: "Invalid login attempt for admin (3)",
          });
        }
      }

      if (roles.includes("SubHyperAgent")) {
        existingUser = await SubAdmin.findById(user.id).exec();
        if (!existingUser) {
          return res.status(401).send({
            code: 401,
            message: "Invalid login attempt for admin (3)",
          });
        }
      }

      if (roles.includes("SubSuperAgent")) {
        existingUser = await SubAdmin.findById(user.id).exec();
        if (!existingUser) {
          return res.status(401).send({
            code: 401,
            message: "Invalid login attempt for admin (3)",
          });
        }
      }

      if (roles.includes("SubMasterAgent")) {
        existingUser = await SubAdmin.findById(user.id).exec();
        if (!existingUser) {
          return res.status(401).send({
            code: 401,
            message: "Invalid login attempt for admin (3)",
          });
        }
      }
      if (roles.includes("TransferBalance")) {
        existingUser = await SubAdmin.findById(user.id).exec();
        if (!existingUser) {
          return res.status(401).send({
            code: 401,
            message: "Invalid login attempt for admin (3)",
          });
        } 
      }
      if (roles.includes("Status")) {
        existingUser = await SubAdmin.findById(user.id).exec();
        if (!existingUser) {
          return res.status(401).send({
            code: 401,
            message: "Invalid login attempt for admin (3)",
          });
        }
      }
      if (roles.includes("CreditRef-Edit")) {
        existingUser = await SubAdmin.findById(user.id).exec();
        if (!existingUser) {
          return res.status(401).send({
            code: 401,
            message: "Invalid login attempt for admin (3)",
          });
        }
      }
      if (roles.includes("Partnership-Edit")) {
        existingUser = await SubAdmin.findById(user.id).exec();
        if (!existingUser) {
          return res.status(401).send({
            code: 401,
            message: "Invalid login attempt for admin (3)",
          });
        }
      }
      if (roles.includes("CreditRef-View")) {
        existingUser = await SubAdmin.findById(user.id).exec();
        if (!existingUser) {
          return res.status(401).send({
            code: 401,
            message: "Invalid login attempt for admin (3)",
          });
        }
      }
      if (roles.includes("Partnership-View")) {
        existingUser = await SubAdmin.findById(user.id).exec();
        if (!existingUser) {
          return res.status(401).send({
            code: 401,
            message: "Invalid login attempt for admin (3)",
          });
        }
      }
      if (roles.includes("User-Profile-View")) {
        existingUser = await SubAdmin.findById(user.id).exec();
        if (!existingUser) {
          return res.status(401).send({
            code: 401,
            message: "Invalid login attempt for admin (3)",
          });
        }
      }
      if (roles.includes("Profile-View")) {
        existingUser = await SubAdmin.findById(user.id).exec();
        if (!existingUser) {
          return res.status(401).send({
            code: 401,
            message: "Invalid login attempt for admin (3)",
          });
        }
      }
      if (roles.includes("Create-Admin")) {
        existingUser = await SubAdmin.findById(user.id).exec();
        if (!existingUser) {
          return res.status(401).send({
            code: 401,
            message: "Invalid login attempt for admin (3)",
          });
        }
      }
      if (roles.includes("Create-subAdmin")) {
        existingUser = await SubAdmin.findById(user.id).exec();
        if (!existingUser) {
          return res.status(401).send({
            code: 401,
            message: "Invalid login attempt for admin (3)",
          });
        }
      }
      // if (roles.includes("Create-User")) {
      //   existingUser = await Admin.findById(user.id).exec();
      //   if (!existingUser) {
      //     return res.status(401).send({
      //       code: 401,
      //       message: "Invalid login attempt for admin (3)",
      //     });
      //   }
      // }
      if (roles.includes("AccountStatement")) {
        existingUser = await SubAdmin.findById(user.id).exec();
        if (!existingUser) {
          return res.status(401).send({
            code: 401,
            message: "Invalid login attempt for admin (3)",
          }); 
        }
      }
      if (roles.includes("ActivityLog")) {
        existingUser = await SubAdmin.findById(user.id).exec();
        if (!existingUser) {
          return res.status(401).send({
            code: 401,
            message: "Invalid login attempt for admin (3)",
          });
        }
      }
      if (roles.includes("Delete-Admin")) {
        existingUser = await SubAdmin.findById(user.id).exec();
        if (!existingUser) {
          return res.status(401).send({
            code: 401,
            message: "Invalid login attempt for admin (3)",
          });
        }
      }
      if (roles.includes("Restore-Admin")) {
        existingUser = await SubAdmin.findById(user.id).exec();
        if (!existingUser) {
          return res.status(401).send({
            code: 401,
            message: "Invalid login attempt for admin (3)",
          });
        }
      }
      if (roles.includes("Move-To-Trash")) {
        existingUser = await SubAdmin.findById(user.id).exec();
        if (!existingUser) {
          return res.status(401).send({
            code: 401,
            message: "Invalid login attempt for admin (3)",
          });
        }
      }
      if (roles.includes("Trash-View")) {
        existingUser = await SubAdmin.findById(user.id).exec();
        if (!existingUser) {
          return res.status(401).send({
            code: 401,
            message: "Invalid login attempt for admin (3)",
          });
        }
      }
      // if (roles.includes("View-Status")) {
      //   existingUser = await Admin.findById(user.id).exec();
      //   if (!existingUser) {
      //     return res.status(401).send({
      //       code: 401,
      //       message: "Invalid login attempt for admin (3)",
      //     });
      //   }
      // }
      if (roles.includes("View-Admin-Data")) {
        existingUser = await SubAdmin.findById(user.id).exec();
        if (!existingUser) {
          return res.status(401).send({
            code: 401,
            message: "Invalid login attempt for admin (3)",
          });
        }
      }
      // if (roles.includes("user")) {
      //   existingUser = await User.findById(user.id).exec();
      //   if (!existingUser) {
      //     return res.status(401).send({
      //       code: 401,
      //       message: "Invalid login attempt for admin (4)",
      //     });
      //   }
      // }
      if (roles && roles.length > 0) {
        // console.log('roles',roles)
        let userHasRequiredRole = false;
        let userHasRequiredPermission = false;
        roles.forEach((role) => {
          // console.log('role',role)
            const rolesArray = existingUser.roles;
          // console.log('rolesArray',rolesArray)
            for (let i = 0; i < rolesArray.length; i++) {
          // console.log('rolesAr',rolesArray[i])

                if (rolesArray[i].role === role || rolesArray[i].permission.includes(role)) {                  
                    userHasRequiredRole = true;
                    userHasRequiredPermission = true;
                }
            }
        });
        if (!userHasRequiredRole && !userHasRequiredPermission) {
          // console.log('unauthorised')
            return res.status(401).send({ code: 401, message: "Unauthorized access" });
        }
        else{
          // console.log('Inform karo')
        }
    }
    

      req.user = existingUser;
      next();
    } catch (err) {
      console.error("Authorization Error:", err.message);
      return res.status(401).send({ code: 401, message: "Unauthorized access" });
    }
  };
};