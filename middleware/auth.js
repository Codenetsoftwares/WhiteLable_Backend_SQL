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

      if (
        roles.includes("All-Access") ||
        roles.includes("WhiteLabel") ||
        roles.includes("HyperAgent") ||
        roles.includes("SuperAgent") ||
        roles.includes("MasterAgent") ||
        roles.includes("superAdmin")
      ) {
        existingUser = await Admin.findById(user.id).exec();
        if (!existingUser && roles.includes("SubAdmin")) {
          existingUser = await SubAdmin.findById(user.id).exec();
        }
        if (!existingUser) {
          return res
            .status(401)
            .send({ code: 401, message: "Unauthorized access" });
        }
      } else if (
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
        roles.includes("View-Admin-Data")
      ) {
        existingUser = await SubAdmin.findById(user.id).exec();
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
        let userHasRequiredRole = false;
        let userHasRequiredPermission = false;
        roles.forEach((role) => {
          const rolesArray = existingUser.roles;
          for (let i = 0; i < rolesArray.length; i++) {
            if (
              rolesArray[i].role === role ||
              rolesArray[i].permission.includes(role)
            ) {
              userHasRequiredRole = true;
              userHasRequiredPermission = true;
            }
          }
        });
        if (!userHasRequiredRole && !userHasRequiredPermission) {
          return res.status(401).send({ code: 401, message: "Unauthorized access" });
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
