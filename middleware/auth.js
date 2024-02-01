import jwt from "jsonwebtoken";
import { Admin } from "../models/admin.model.js";
import { SubAdmin } from '../models/subAdmin.model.js'


export const Authorize = (roles) => {
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
      existingUser = await Admin.findById(user.id).exec();;
      console.log('existingAdmin', existingUser)
      if (existingUser) {
        if (
          roles.includes("All-Access") ||
          roles.includes("WhiteLabel") ||
          roles.includes("HyperAgent") ||
          roles.includes("SuperAgent") ||
          roles.includes("MasterAgent") ||
          roles.includes("superAdmin")
        ) {
          existingUser = await Admin.findById(user.id).exec();
          console.log('exist', existingUser)

          if (!existingUser && roles.includes("SubAdmin")) {
            existingUser = await SubAdmin.findById(user.id).exec();
            console.log('exis48', existingUser)
          }
          if (!existingUser) {
            return res
              .status(401)
              .send({ code: 401, message: "Unauthorized access" });
          }
        }

        if (!existingUser.isActive && !existingUser.locked) {
          return res
            .status(423)
            .send({ code: 423, message: "" });
        }
      
      }
      else if (
        roles.includes("SubWhiteLabel") ||
        roles.includes("SubHyperAgent") ||
        roles.includes("SubSuperAgent") ||
        roles.includes("SubMasterAgent") ||
        roles.includes("TransferBalance") ||
        roles.includes("Status") ||
        roles.includes("CreditRef-Edit") ||
        roles.includes("Partnership-Edit") ||
        roles.includes("CreditRef-View") ||
        roles.includes("Partnership-View") ||
        roles.includes("User-Profile-View") ||
        roles.includes("Profile-View") ||
        roles.includes("Create-Admin") ||
        roles.includes("Create-subAdmin") ||
        roles.includes("AccountStatement") ||
        roles.includes("ActivityLog") ||
        roles.includes("Delete-Admin") ||
        roles.includes("Restore-Admin") ||
        roles.includes("Move-To-Trash") ||
        roles.includes("Trash-View") ||
        roles.includes("View-Admin-Data") ||
        roles.includes("Account-Statement")
      ) {
        console.log('res')
        existingUser = await SubAdmin.findById(user.id).exec();
        console.log('existinguser', existingUser)
        if (!existingUser) {
          return res
            .status(401)
            .send({ code: 401, message: "Unauthorized access" });
        }
      } else {
        return res
          .status(401)
          .send({ code: 401, message: "Unauthorized access" });
      }
      if (roles && roles.length > 0) {
        console.log('roles',roles)
        let userHasRequiredRole = false;
        let userHasRequiredPermission = false;
        roles.forEach((role) => {
          console.log('role',role)
          const rolesArray = existingUser.roles[0];
          console.log('rolesArray', rolesArray.role === role ||
          rolesArray.permission.includes(role))
            if (
              rolesArray.role === role ||
              rolesArray.permission.includes(role)
            ) {
              userHasRequiredRole = true;
              userHasRequiredPermission = true;
            }
        });
        if (!userHasRequiredRole && !userHasRequiredPermission) {
          return res
          .status(401)
          .send({ code: 401, message: "Unauthorized access" });
        }
      }

      req.user = existingUser;
      next();
    } catch (err) {
      console.error("Authorization Error:", err.message);
      return res
      .status(401)
      .send({ code: 401, message: "Unauthorized access" });
    }
  };
};
