import { Authorize } from '../middleware/auth.js';

import customErrorHandler from '../helper/customErrorHandler.js';
import {
  createAdminSchema,
  createSubAdminSchema,
  viewAllCreatesSchema,
  viewAllSubAdminCreatesSchema,
  creditRefSchema,
  moveToTrashSchema,
  deleteFromTrashSchema,
  activeStatusSchema,
  restoreAdminUserSchema,
  profileViewSchema,
  partnershipEditSchema,
  partnershipViewSchema,
  creditRefViewSchema,
  rootPathSchema,
  viewSubAdminSchema,
  singleSubAdminSchema,
  subAdminPermissionSchema,
  userStatusSchema,
} from '../schema/commonSchema.js';

import {
  createAdmin,
  createSubAdmin,
  getIpDetail,
  viewAllSubAdminCreates,
  editCreditRef,
  moveAdminToTrash,
  viewTrash,
  activeStatus,
  restoreAdminUser,
  profileView,
  viewAllCreates,
  editPartnership,
  partnershipView,
  creditRefView,
  buildRootPath,
  viewSubAdmins,
  singleSubAdmin,
  subAdminPermission,
  userStatus,
  deleteTrashData,
} from '../controller/admin.controller.js';
import { string } from '../constructor/string.js';
import { role } from '../constructor/roles.js';
import { permission } from '../constructor/permissions.js';
import { permissionAuth } from '../middleware/permissionAuth.js';
import { roleAuth } from '../middleware/roleAuth.js';


export const adminRoute = (app) => {

  // Create Admin API ("DONE")
  app.post('/api/admin-create',
    createAdminSchema,
    customErrorHandler,
    roleAuth([
        role.superAdmin,
        role.whiteLabel,
        role.hyperAgent,
        role.superAgent,
        role.masterAgent,
        role.subWhiteLabel,
        role.subAdmin,
        role.subHyperAgent,
        role.subSuperAgent,
        role.subMasterAgent,
    ]),
    permissionAuth([
        permission.createAdmin,
    ]),
    createAdmin,
);

  // Create SubAdmin API ("DONE")
  app.post('/api/admin/create-subAdmin',
    createSubAdminSchema,
    customErrorHandler,
    Authorize([
      string.superAdmin,
      string.whiteLabel,
      string.hyperAgent,
      string.subSuperAgent,
      string.masterAgent,
      string.subWhiteLabel,
      string.subAdmin,
      string.subHyperAgent,
      string.subSuperAgent,
      string.subMasterAgent,
      string.createSubAdmin
    ]),
    createSubAdmin,
  );

  app.get('/getip/:username',
    Authorize(['superAdmin', 'WhiteLabel', 'HyperAgent', 'SuperAgent', 'MasterAgent', 'ActivityLog']),
    customErrorHandler,
    getIpDetail,
  );


  // View All Creates API ("DONE")
  app.get('/api/view-all-creates/:createdById',
    viewAllCreatesSchema,
    customErrorHandler,
    Authorize([
      string.superAdmin,
      string.whiteLabel,
      string.hyperAgent,
      string.superAgent,
      string.masterAgent,
      string.transferBalance,
      string.status,
      string.creditRefEdit,
      string.partnershipEdit,
      string.creditRefView,
      string.partnershipView,
      string.userProfileView,
      string.profileView,
      string.viewAdminData,
      string.createAdmin,
      string.createUser,
      string.accountStatement,
      string.activityLog,
      string.deleteAdmin,
      string.restoreAdmin,
      string.moveToTrash,
      string.trashView,
    ]),
    viewAllCreates,
  );

  // View All Sub Admins Creates ("DONE")
  app.get('/api/view-all-subAdmin-creates/:createdById',
    viewAllSubAdminCreatesSchema,
    customErrorHandler,
    Authorize([
      string.superAdmin,
      string.whiteLabel,
      string.hyperAgent,
      string.superAgent,
      string.masterAgent,
      string.subAdmin,
      string.subHyperAgent,
      string.subMasterAgent,
      string.subWhiteLabel,
      string.subSuperAgent,
      string.transferBalance,
      string.status,
      string.creditRefEdit,
      string.partnershipEdit,
      string.creditRefView,
      string.partnershipView,
      string.userProfileView,
      string.profileView,
      string.viewAdminData,
      string.createAdmin,
      string.createUser,
      string.accountStatement,
      string.activityLog,
      string.deleteAdmin,
      string.restoreAdmin,
      string.moveToTrash,
      string.trashView,
    ]),
    viewAllSubAdminCreates,
  );

  // Credit Ref Edit API ("DONE")
  app.put(
    '/api/admin/update-credit-ref/:adminId',
    creditRefSchema,
    customErrorHandler,
    Authorize([
      string.superAdmin,
      string.whiteLabel,
      string.hyperAgent,
      string.superAgent,
      string.masterAgent,
      string.creditRefEdit
    ]),
    editCreditRef,
  );

  // PartnerShip Edit API ("DONE")
  app.put('/api/admin/update-partnership/:adminId',
    partnershipEditSchema,
    customErrorHandler,
    Authorize([
      string.superAdmin,
      string.whiteLabel,
      string.hyperAgent,
      string.superAgent,
      string.masterAgent,
      string.partnershipEdit
    ]),
    editPartnership,
  );

  // PartnerShip View API ("DONE")
  app.get('/api/partnershipView/:adminId',
    partnershipViewSchema,
    customErrorHandler,
    Authorize([
      string.superAdmin,
      string.whiteLabel,
      string.hyperAgent,
      string.superAgent,
      string.masterAgent,
      string.partnershipView
    ]),
    partnershipView,
  );

  // CreditRef View API ("DONE")
  app.get(
    '/api/creditRefView/:adminId',
    creditRefViewSchema,
    customErrorHandler,
    Authorize([
      string.superAdmin,
      string.whiteLabel,
      string.hyperAgent,
      string.superAgent,
      string.masterAgent,
      string.creditRefView
    ]),
    creditRefView,
  );

  app.post(
    '/api/admin/move-to-trash-user',
    Authorize(['superAdmin', 'WhiteLabel', 'HyperAgent', 'SuperAgent', 'MasterAgent', 'Move-To-Trash']),
    moveToTrashSchema,
    customErrorHandler,
    moveAdminToTrash,
  );

  app.get(
    '/api/admin/view-trash',
    Authorize(['superAdmin', 'WhiteLabel', 'HyperAgent', 'SuperAgent', 'MasterAgent', 'Trash-View']),
    customErrorHandler,
    viewTrash,
  );

  app.delete(
    '/api/delete/admin-user/:trashId',
    Authorize(['superAdmin', 'WhiteLabel', 'HyperAgent', 'SuperAgent', 'MasterAgent', 'Delete-Admin']),
    deleteFromTrashSchema,
    customErrorHandler,
    deleteTrashData,
  );

  app.get(
    '/api/admin/active-status/:adminId',
    Authorize(['superAdmin', 'WhiteLabel', 'HyperAgent', 'SuperAgent', 'MasterAgent', 'Status']),
    activeStatusSchema,
    customErrorHandler,
    activeStatus,
  );

  app.post(
    '/api/admin/restore-to-wallet-use',
    Authorize(['superAdmin', 'WhiteLabel', 'HyperAgent', 'SuperAgent', 'MasterAgent', 'Restore-Admin']),
    restoreAdminUserSchema,
    customErrorHandler,
    restoreAdminUser,
  );

  app.get('/api/User-Profile-view/:userName',
    Authorize(['superAdmin', 'WhiteLabel', 'HyperAgent', 'SuperAgent', 'MasterAgent', 'User-Profile-View']),
    profileViewSchema,
    customErrorHandler,
    profileView,
  );

  // Root Path API ("DONE")
  app.post('/api/Root-Path/:userName/:action', rootPathSchema, customErrorHandler, buildRootPath);

  // view-sub-admins ("DONE")
  app.get('/api/admin/view-sub-admins/:adminId',
    viewSubAdminSchema,
    customErrorHandler,
    Authorize([
      string.superAdmin,
      string.whiteLabel,
      string.hyperAgent,
      string.superAgent,
      string.masterAgent,
      string.viewSubAdmin
    ]),
    viewSubAdmins,
  );
  // single-sub-admin ("DONE")
  app.post('/api/admin/single-sub-admin/:adminId',
    singleSubAdminSchema,
    customErrorHandler,
    Authorize([
      string.superAdmin,
      string.whiteLabel,
      string.hyperAgent,
      string.superAgent,
      string.masterAgent
    ]),
    singleSubAdmin,
  );
  // edit-subAdmin-permissions ("DONE")
  app.put('/admin/edit-subAdmin-permissions/:adminId',
    subAdminPermissionSchema,
    customErrorHandler,
    Authorize([
      string.superAdmin,
      string.whiteLabel,
      string.hyperAgent,
      string.superAgent,
      string.masterAgent
    ]),
    subAdminPermission,
  );
  // user-status ("DONE")
  app.get('/api/user-status/:userName', userStatusSchema, customErrorHandler, userStatus);
};
