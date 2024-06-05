import { string } from "../constructor/string.js";
import { adminPasswordResetCode, adminLogin } from "../controller/auth.controller.js";
import customErrorHandler from "../helper/customErrorHandler.js";
import { Authorize } from "../middleware/auth.js";
import { adminPasswordResetSchema, adminLoginSchema } from "../schema/commonSchema.js";



export const authRoute = (app) => {
    // Login API For Admin and Sub Admin ("DONE")
    app.post('/api/admin-login', adminLoginSchema, customErrorHandler, adminLogin);

    //  Password Reset API ("DONE")
    app.post('/api/admin/reset-password',
        adminPasswordResetSchema,
        customErrorHandler,
        Authorize([
        string.superAdmin,
        string.whiteLabel,
        string.hyperAgent,
        string.superAgent,
        string.masterAgent
    ]),
        adminPasswordResetCode,
    );

}