import { string } from '../constructor/string.js';
import { Authorize } from '../middleware/auth.js';
import customErrorHandler from '../helper/customErrorHandler.js';
import { moveToTrashSchema, deleteFromTrashSchema, restoreAdminUserSchema } from '../schema/commonSchema.js';
import { moveAdminToTrash, viewTrash, deleteTrashData, restoreAdminUser } from '../controller/trash.controller.js';

export const trashRoute = (app) => {
  // Move Admin User To Trash ("DONE")
  app.post(
    '/api/admin/move-to-trash-user',
    moveToTrashSchema,
    customErrorHandler,
    Authorize([
      string.superAdmin,
      string.whiteLabel,
      string.hyperAgent,
      string.superAgent,
      string.masterAgent,
      string.moveToTrash,
    ]),
    moveAdminToTrash,
  );

  // View Trash API ("DONE")
  app.get(
    '/api/admin/view-trash/:createdById',
    customErrorHandler,
    Authorize([
      string.superAdmin,
      string.whiteLabel,
      string.hyperAgent,
      string.superAgent,
      string.masterAgent,
      string.trashView,
    ]),
    viewTrash,
  );

  // Delete Trash Data API ("DONE")
  app.delete(
    '/api/delete/admin-user/:trashId',
    deleteFromTrashSchema,
    customErrorHandler,
    Authorize([
      string.superAdmin,
      string.whiteLabel,
      string.hyperAgent,
      string.superAgent,
      string.masterAgent,
      string.deleteAdmin,
    ]),
    deleteTrashData,
  );

  // Restore Deleted Admin API ("DONE")
  app.post(
    '/api/admin/restore-to-wallet-use',
    restoreAdminUserSchema,
    customErrorHandler,
    Authorize([
      string.superAdmin,
      string.whiteLabel,
      string.hyperAgent,
      string.superAgent,
      string.masterAgent,
      string.restoreAdmin,
    ]),
    restoreAdminUser,
  );
};
