import { adminPasswordResetCode, generateAdminAccessToken } from '../controller/auth.controller.js';
import customErrorHandler from '../helper/customErrorHandler.js';
import { Authorize } from '../middleware/auth.js';
import { adminPasswordResetSchema, adminLoginSchema } from '../schema/commonSchema.js';

export const authRoute = (app) => {
  // Login API For Admin and Sub Admin ("DONE")
  app.post('/api/admin-login', adminLoginSchema, customErrorHandler, generateAdminAccessToken);

  //  Password Reset API ("DONE")
  app.post(
    '/api/admin/reset-password',
    Authorize(['superAdmin', 'WhiteLabel', 'HyperAgent', 'SuperAgent', 'MasterAgent']),
    adminPasswordResetSchema,
    customErrorHandler,
    adminPasswordResetCode,
  );
};
