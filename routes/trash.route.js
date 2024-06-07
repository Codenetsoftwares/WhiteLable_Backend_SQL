import { stringConstructor } from '../constructor/stringConstructor.js';
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
      stringConstructor.superAdmin,
      stringConstructor.whiteLabel,
      stringConstructor.hyperAgent,
      stringConstructor.superAgent,
      stringConstructor.masterAgent,
      stringConstructor.moveToTrash,
    ]),
    moveAdminToTrash,
  );

  // View Trash API ("DONE")
  app.get(
    '/api/admin/view-trash',
    customErrorHandler,
    Authorize([
      stringConstructor.superAdmin,
      stringConstructor.whiteLabel,
      stringConstructor.hyperAgent,
      stringConstructor.superAgent,
      stringConstructor.masterAgent,
      stringConstructor.trashView,
    ]),
    viewTrash,
  );

  // Delete Trash Data API ("DONE")
  app.delete(
    '/api/delete/admin-user/:trashId',
    deleteFromTrashSchema,
    customErrorHandler,
    Authorize([
      stringConstructor.superAdmin,
      stringConstructor.whiteLabel,
      stringConstructor.hyperAgent,
      stringConstructor.superAgent,
      stringConstructor.masterAgent,
      stringConstructor.deleteAdmin,
    ]),
    deleteTrashData,
  );

  // Restore Deleted Admin API ("DONE")
  app.post(
    '/api/admin/restore-to-wallet-use',
    restoreAdminUserSchema,
    customErrorHandler,
    Authorize([
      stringConstructor.superAdmin,
      stringConstructor.whiteLabel,
      stringConstructor.hyperAgent,
      stringConstructor.superAgent,
      stringConstructor.masterAgent,
      stringConstructor.restoreAdmin,
    ]),
    restoreAdminUser,
  );
};
