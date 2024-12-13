import { string } from "../constructor/string.js";
import { adminPasswordResetCode, adminLogin, resetPassword, loginResetPassword, logout } from "../controller/auth.controller.js";
import customErrorHandler from "../helper/customErrorHandler.js";
import { Authorize } from "../middleware/auth.js";
import { adminPasswordResetSchema, adminLoginSchema, resetPasswordSchema, loginResetPasswordSchema, logOutValidate } from "../schema/commonSchema.js";



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

    app.post('/api/external/reset-password', resetPasswordSchema, customErrorHandler, resetPassword);

    app.post('/api/login-reset-password',loginResetPasswordSchema ,customErrorHandler, loginResetPassword);

    app.post('/api/logout',logOutValidate, customErrorHandler ,
        logout)

}