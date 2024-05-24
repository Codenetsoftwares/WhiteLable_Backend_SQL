import { Authorize } from '../middleware/auth.js';

import customErrorHandler from '../helper/customErrorHandler.js';
import {
  crateAdminSchema,
  createSubAdminSchema,
  AdminloginSchema,
  AdminPasswordResetSchema,
  depositeAmountSchema,
  transferAmountSchema,
  transactionViewSchema,
  viewAllCreatesSchema,
  viewAllSubAdminCreatesSchema,
  viewBalanceSchema,
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
  accountStatementSchema,
  userStatusSchema,
} from '../schema/commonSchema.js';

import {
  createAdmin,
  createSubAdmin,
  generateAdminAccessToken,
  getIpDetail,
  AdminPasswordResetCode,
  depositTransaction,
  transferAmount,
  transactionView,
  viewAllSubAdminCreates,
  viewBalance,
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
  accountStatement,
  userStatus,
  deleteTrashData,
} from '../controller/admin.controller.js';

export const AdminRoute = (app) => {
  // Create Admin API ("DONE")
  app.post(
    '/api/admin-create',
    Authorize([
      'superAdmin',
      'WhiteLabel',
      'HyperAgent',
      'SuperAgent',
      'MasterAgent',
      'SubWhiteLabel',
      'SubAdmin',
      'SubHyperAgent',
      'SubSuperAgent',
      'SubMasterAgent',
      'Create-Admin',
    ]),
    crateAdminSchema,
    customErrorHandler,
    createAdmin,
  );

  // Create SubAdmin API ("DONE")
  app.post(
    '/api/admin/create-subAdmin',
    Authorize([
      'superAdmin',
      'WhiteLabel',
      'HyperAgent',
      'SuperAgent',
      'MasterAgent',
      'SubWhiteLabel',
      'SubAdmin',
      'SubHyperAgent',
      'SubSuperAgent',
      'SubMasterAgent',
      'Create-subAdmin',
    ]),
    createSubAdminSchema,
    customErrorHandler,
    createSubAdmin,
  );

  // Login API For Admin and Sub Admin ("DONE")
  app.post('/api/admin-login', AdminloginSchema, customErrorHandler, generateAdminAccessToken);

  // Ip Detail API ("DONE")
  app.get(
    '/api/get-ip-detail/:userName',
    Authorize(['superAdmin', 'WhiteLabel', 'HyperAgent', 'SuperAgent', 'MasterAgent', 'ActivityLog']),
    customErrorHandler,
    getIpDetail,
  );

  //  Password Reset API ("DONE")
  app.post(
    '/api/admin/reset-password',
    Authorize(['superAdmin', 'WhiteLabel', 'HyperAgent', 'SuperAgent', 'MasterAgent']),
    AdminPasswordResetSchema,
    customErrorHandler,
    AdminPasswordResetCode,
  );

  // Admin Self Transaction API ("DONE")
  app.post(
    '/api/admin/deposit-amount/:adminId',
    Authorize(['superAdmin']),
    depositeAmountSchema,
    customErrorHandler,
    depositTransaction,
  );

  // Transfer Amount API ("DONE")
  app.post(
    '/api/transfer-amount/:adminId',
    Authorize(['superAdmin', 'WhiteLabel', 'HyperAgent', 'SuperAgent', 'TransferBalance']),
    transferAmountSchema,
    customErrorHandler,
    transferAmount,
  );

  // Transaction View API ("DONE")
  app.get(
    '/api/transaction-view/:userName',
    Authorize(['superAdmin', 'WhiteLabel', 'HyperAgent', 'SuperAgent', 'MasterAgent', 'AccountStatement']),
    transactionViewSchema,
    customErrorHandler,
    transactionView,
  );

  // View All Creates API ("DONE")
  app.get(
    '/api/view-all-creates/:createdById',
    Authorize([
      'superAdmin',
      'WhiteLabel',
      'HyperAgent',
      'SuperAgent',
      'MasterAgent',
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
    viewAllCreatesSchema,
    customErrorHandler,
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

  // View Balance API ("DONE")
  app.get(
    '/api/view-balance/:adminId',
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
    ]),
    viewBalanceSchema,
    customErrorHandler,
    viewBalance,
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

  // Account Statement API ("DONE")
  app.get(
    '/api/admin/account-statement/:adminId',
    Authorize([
      'superAdmin',
      'WhiteLabel',
      'HyperAgent',
      'SuperAgent',
      'MasterAgent',
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
      'AccountStatement',
    ]),
    accountStatementSchema,
    customErrorHandler,
    accountStatement,
  );

  // User State API ("DONE")
  app.get('/api/user-status/:userName', userStatusSchema, customErrorHandler, userStatus);
};
