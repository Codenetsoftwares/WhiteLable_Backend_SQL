import { string } from "../constructor/string.js";
import { activateAdmin } from "../controller/activeAdmin.js";
import { apiResponseErr } from "../helper/errorHandler.js";
import CustomError from "../helper/extendError.js";
import { statusCode } from "../helper/statusCodes.js";
import { Authorize } from "../middleware/auth.js";
import admins from "../models/admin.model.js";
import bcrypt from "bcrypt";
import { activeInactive } from "../schema/commonSchema.js";
import customErrorHandler from "../helper/customErrorHandler.js";

export const activeAdminRoute = (app) => {
  app.post(
    "/api/activate/:adminId",
    activeInactive,
    customErrorHandler,
    Authorize([
      string.superAdmin,
      string.whiteLabel,
      string.hyperAgent,
      string.superAgent,
      string.masterAgent,
      string.status,
    ]),
    async (req, res) => {
      try {
        const { adminId } = req.params;
        const { isActive, locked, password } = req.body;

        // Find the admin by adminId
        const admin = await admins.findOne({ where: { adminId } });

        // Check if admin exists
        if (!admin) {
          throw new CustomError("Admin not found", null, statusCode.notFound);
        }

        // Validate password
        const isPasswordValid = await bcrypt.compare(password, admin.password);
        if (!isPasswordValid) {
          throw new CustomError("Invalid password", null, statusCode.badRequest);
        }

        // Activate or suspend admin
        const adminActive = await activateAdmin(adminId, isActive, locked);

        // Check if the admin has subordinates
        let hasSubordinates = false;

        const subordinates = await admins.findAll({ where: { createdById: adminId } });
        if (subordinates.length > 0) {
          hasSubordinates = true;
        }

        // Construct response message based on subordinates
        let message = "";
        if (hasSubordinates) {
          message = adminActive?.message ?? "Admin Activated/Deactivated successfully.";
        } else {
          message = "Admin Activated/Deactivated successfully. No agents under this admin.";
        }

        return res.status(statusCode.success).send({ message, adminActive });
      } catch (error) {
        // Handle errors
        res.status(error.responseCode ?? statusCode.internalServerError).send(
          apiResponseErr(
            error.data ?? null,
            false,
            error.responseCode ?? statusCode.internalServerError,
            error.errMessage ?? error.message
          )
        );
      }
    }
  );
};
