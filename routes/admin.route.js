import { Authorize } from '../middleware/auth.js';
import customErrorHandler from '../helper/customErrorHandler.js';

import {
  createAdminSchema,
  createSubAdminSchema,
  viewAllCreatesSchema,
  viewAllSubAdminCreatesSchema,
  creditRefSchema,
  activeStatusSchema,
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
  activeStatus,
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
} from '../controller/admin.controller.js';

import { stringConstructor } from '../constructor/stringConstructor.js';

export const AdminRoute = (app) => {
  // Create Admin API ("DONE")
  app.post(
    '/api/admin-create',
    createAdminSchema,
    customErrorHandler,
    Authorize([
      stringConstructor.superAdmin,
      stringConstructor.whiteLabel,
      stringConstructor.hyperAgent,
      stringConstructor.subSuperAgent,
      stringConstructor.masterAgent,
      stringConstructor.subWhiteLabel,
      stringConstructor.subAdmin,
      stringConstructor.subHyperAgent,
      stringConstructor.subSuperAgent,
      stringConstructor.subMasterAgent,
      stringConstructor.createAdmin,
    ]),
    createAdmin,
  );

  // Create SubAdmin API ("DONE")
  app.post(
    '/api/admin/create-subAdmin',
    createSubAdminSchema,
    customErrorHandler,
    Authorize([
      stringConstructor.superAdmin,
      stringConstructor.whiteLabel,
      stringConstructor.hyperAgent,
      stringConstructor.subSuperAgent,
      stringConstructor.masterAgent,
      stringConstructor.subWhiteLabel,
      stringConstructor.subAdmin,
      stringConstructor.subHyperAgent,
      stringConstructor.subSuperAgent,
      stringConstructor.subMasterAgent,
      stringConstructor.createSubAdmin,
    ]),
    createSubAdmin,
  );

  // Ip Detail API ("DONE")
  app.get(
    '/api/get-ip/:userName',
    Authorize([
      stringConstructor.superAdmin,
      stringConstructor.whiteLabel,
      stringConstructor.hyperAgent,
      stringConstructor.superAgent,
      stringConstructor.masterAgent,
      stringConstructor.activityLog,
    ]),
    customErrorHandler,
    getIpDetail,
  );

  // View All Creates API ("DONE")
  app.get(
    '/api/view-all-creates/:createdById',
    viewAllCreatesSchema,
    customErrorHandler,
    Authorize([
      stringConstructor.superAdmin,
      stringConstructor.whiteLabel,
      stringConstructor.hyperAgent,
      stringConstructor.subSuperAgent,
      stringConstructor.masterAgent,
      stringConstructor.transferBalance,
      stringConstructor.status,
      stringConstructor.creditRefEdit,
      stringConstructor.partnershipEdit,
      stringConstructor.creditRefView,
      stringConstructor.partnershipView,
      stringConstructor.userProfileView,
      stringConstructor.profileView,
      stringConstructor.viewAdminData,
      stringConstructor.createAdmin,
      stringConstructor.createUser,
      stringConstructor.accountStatement,
      stringConstructor.activityLog,
      stringConstructor.deleteAdmin,
      stringConstructor.restoreAdmin,
      stringConstructor.moveToTrash,
      stringConstructor.trashView,
    ]),
    viewAllCreates,
  );

  // View All Sub Admins Creates ("DONE")
  app.get(
    '/api/view-all-subAdmin-creates/:createdById',
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

  // View Active Status API ("DONE")
  app.get(
    '/api/admin/active-status/:adminId',
    activeStatusSchema,
    customErrorHandler,
    Authorize([
      stringConstructor.superAdmin,
      stringConstructor.whiteLabel,
      stringConstructor.hyperAgent,
      stringConstructor.superAgent,
      stringConstructor.masterAgent,
      stringConstructor.status,
    ]),
    activeStatus,
  );

  // Profile View API ("DONE")
  app.get(
    '/api/User-Profile-view/:userName',
    profileViewSchema,
    customErrorHandler,
    Authorize([
      stringConstructor.superAdmin,
      stringConstructor.whiteLabel,
      stringConstructor.hyperAgent,
      stringConstructor.superAgent,
      stringConstructor.masterAgent,
      stringConstructor.userProfileView,
    ]),
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
