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
        const admin = await admins.findOne({ where: { adminId } });
console.log("password....ttt",password)
        const isPasswordValid = await bcrypt.compare(password, admin.password);
        if (!isPasswordValid) {
          throw new CustomError(
            "Invalid password",
            null,
            statusCode.badRequest
          );
        }
        console.log("Password......", isPasswordValid);
        const adminActive = await activateAdmin(adminId, isActive, locked);

        return res.status(statusCode.success).send(adminActive);
      } catch (error) {
        
        res
          .status(statusCode.internalServerError)
          .send(
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
