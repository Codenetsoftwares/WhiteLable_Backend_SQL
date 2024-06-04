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
  viewSubAdmis,
  singleSubAdmin,
  subAdminPermission,
  userStatus,
  deleteTrashData,
} from '../controller/admin.controller.js';
import { string } from '../constructor/string.js';


export const adminRoute = (app) => {

  // Create Admin API ("DONE")
  app.post('/api/admin-create',
    createAdminSchema,
    customErrorHandler,
    Authorize([
      string.superAdmin,
      string.whiteLabel,
      string.hyperAgent,
      string.superAgent,
      string.masterAgent,
      string.subWhiteLabel,
      string.subAdmin,
      string.subHyperAgent,
      string.subSuperAgent,
      string.subMasterAgent,
      string.createAdmin,
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

  // Ip Detail API ("DONE")
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
    Authorize([
      'superAdmin',
      'WhiteLabel',
      'HyperAgent',
      'SuperAgent',
      'MasterAgent',
      'SubAdmin',
      'SubWhiteLabel',
      'SubHyperAgent',
      'SubSuperAgent',
      'SubMasterAgent',
      'TransferBalance',
      'Status',
      'CreditRef-Edit',
      'Partnership-Edit',
      'CreditRef-View',
      'Partnership-View',
      'User-Profile-View',
      'Profile-View',
      'View-Admin-Data',
      'Create-Admin',
      'Create-User',
      'AccountStatement',
      'ActivityLog',
      'Delete-Admin',
      'Restore-Admin',
      'Move-To-Trash',
      'Trash-View',
    ]),
    viewAllSubAdminCreatesSchema,
    customErrorHandler,
    viewAllSubAdminCreates,
  );

  // Credit Ref Edit API ("DONE")
  app.put(
    '/api/admin/update-credit-ref/:adminId',
    Authorize(['superAdmin', 'WhiteLabel', 'HyperAgent', 'SuperAgent', 'MasterAgent', 'CreditRef-Edit']),
    creditRefSchema,
    customErrorHandler,
    editCreditRef,
  );

  // Move Admin User To Trash ("DONE")
  app.post(
    '/api/admin/move-to-trash-user',
    Authorize(['superAdmin', 'WhiteLabel', 'HyperAgent', 'SuperAgent', 'MasterAgent', 'Move-To-Trash']),
    moveToTrashSchema,
    customErrorHandler,
    moveAdminToTrash,
  );

  // View Trash API ("DONE")
  app.get(
    '/api/admin/view-trash',
    Authorize(['superAdmin', 'WhiteLabel', 'HyperAgent', 'SuperAgent', 'MasterAgent', 'Trash-View']),
    customErrorHandler,
    viewTrash,
  );

  // Delete Trash Data API ("DONE")
  app.delete(
    '/api/delete/admin-user/:trashId',
    Authorize(['superAdmin', 'WhiteLabel', 'HyperAgent', 'SuperAgent', 'MasterAgent', 'Delete-Admin']),
    deleteFromTrashSchema,
    customErrorHandler,
    deleteTrashData,
  );

  // View Active Status API ("DONE")
  app.get(
    '/api/admin/active-status/:adminId',
    Authorize(['superAdmin', 'WhiteLabel', 'HyperAgent', 'SuperAgent', 'MasterAgent', 'Status']),
    activeStatusSchema,
    customErrorHandler,
    activeStatus,
  );

  // Restore Deleted Admin API ("DONE")
  app.post(
    '/api/admin/restore-to-wallet-use',
    Authorize(['superAdmin', 'WhiteLabel', 'HyperAgent', 'SuperAgent', 'MasterAgent', 'Restore-Admin']),
    restoreAdminUserSchema,
    customErrorHandler,
    restoreAdminUser,
  );

  // Profile View API ("DONE")
  app.get(
    '/api/User-Profile-view/:userName',
    Authorize(['superAdmin', 'WhiteLabel', 'HyperAgent', 'SuperAgent', 'MasterAgent', 'User-Profile-View']),
    profileViewSchema,
    customErrorHandler,
    profileView,
  );

  // PartnerShip Edit API ("DONE")
  app.put(
    '/api/admin/update-partnership/:adminId',
    Authorize(['superAdmin', 'WhiteLabel', 'HyperAgent', 'SuperAgent', 'MasterAgent', 'Partnership-Edit']),
    partnershipEditSchema,
    customErrorHandler,
    editPartnership,
  );

  // PartnerShip View API ("DONE")
  app.get(
    '/api/partnershipView/:adminId',
    Authorize(['superAdmin', 'WhiteLabel', 'HyperAgent', 'SuperAgent', 'MasterAgent', 'Partnership-View']),
    partnershipViewSchema,
    customErrorHandler,
    partnershipView,
  );

  // CreditRef View API ("DONE")
  app.get(
    '/api/creditRefView/:adminId',
    Authorize(['superAdmin', 'WhiteLabel', 'HyperAgent', 'SuperAgent', 'MasterAgent', 'CreditRef-View']),
    creditRefViewSchema,
    customErrorHandler,
    creditRefView,
  );

  // Root Path API ("DONE")
  app.post('/api/Root-Path/:userName/:action', rootPathSchema, customErrorHandler, buildRootPath);

  // View Sub Admins API ("DONE")
  app.get(
    '/api/admin/view-sub-admins/:adminId',
    Authorize(['superAdmin', 'WhiteLabel', 'HyperAgent', 'SuperAgent', 'MasterAgent']),
    viewSubAdminSchema,
    customErrorHandler,
    viewSubAdmis,
  );

  // Single Sub Admin API ("DONE")
  app.post(
    '/api/admin/single-sub-admin/:adminId',
    Authorize(['superAdmin', 'WhiteLabel', 'HyperAgent', 'SuperAgent', 'MasterAgent']),
    singleSubAdminSchema,
    customErrorHandler,
    singleSubAdmin,
  );

  // Permission Edit API ("DONE")
  app.put(
    '/admin/edit-subadmin-permissions/:adminId',
    Authorize(['superAdmin', 'WhiteLabel', 'HyperAgent', 'SuperAgent', 'MasterAgent']),
    subAdminPermissionSchema,
    customErrorHandler,
    subAdminPermission,
  );

  

  // User State API ("DONE")
  app.get('/api/user-status/:userName', userStatusSchema, customErrorHandler, userStatus);
};
