import {
  accountStatement,
  depositTransaction,
  transactionView,
  transferAmount,
  viewAddBalance,
  viewBalance,
} from '../controller/transaction.controller.js';
import customErrorHandler from '../helper/customErrorHandler.js';
import { Authorize } from '../middleware/auth.js';
import {
  accountStatementSchema,
  depositAmountSchema,
  transactionViewSchema,
  transferAmountSchema,
  viewBalanceSchema,
} from '../schema/commonSchema.js';
import { string } from '../constructor/string.js';

export const transactionRoute = (app) => {
  // Admin Self Transaction API ("DONE")
  app.post(
    '/api/admin/deposit-amount/:adminId',
    depositAmountSchema,
    customErrorHandler,
    Authorize([string.superAdmin]),
    depositTransaction,
  );

  // Transfer Amount API ("DONE")
  app.post(
    '/api/transfer-amount/:adminId',
    transferAmountSchema,
    customErrorHandler,
    Authorize([
      string.superAdmin,
      string.whiteLabel,
      string.hyperAgent,
      string.superAgent,
      string.transferBalance,
      string.masterAgent
    ]),
    transferAmount,
  );

  // Transaction View API ("DONE")
  app.get(
    '/api/transaction-view/:userName',
    transactionViewSchema,
    customErrorHandler,
     Authorize([
      string.superAdmin,
      string.whiteLabel,
      string.hyperAgent,
      string.superAgent,
      string.masterAgent,
      string.accountStatement,
    ]),
    transactionView,
  );

  // Account Statement API ("DONE")
  app.get(
    '/api/admin/account-statement/:adminId',
    accountStatementSchema,
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
    accountStatement,
  );

  // View Balance API ("DONE")
  app.get(
    '/api/view-balance/:adminId',
    viewBalanceSchema,
    customErrorHandler,
    Authorize([
      string.superAdmin,
      string.whiteLabel,
      string.hyperAgent,
      string.superAgent,
      string.masterAgent,
      string.subAdmin,
      string.subWhiteLabel,
      string.subHyperAgent,
      string.subSuperAgent,
      string.subMasterAgent,
      string.viewBalance
    ]),
    viewBalance,
  );

  //view the main Balance
  app.get(
    '/api/view-main-balance/:adminId',
    Authorize([
      string.superAdmin,
    ]),
    viewAddBalance
  )
};
