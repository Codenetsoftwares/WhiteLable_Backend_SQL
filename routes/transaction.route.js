import {
  accountStatement,
  depositTransaction,
  transactionView,
  transferAmount,
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
import { stringConstructor } from '../constructor/stringConstructor.js';

export const transactionRoute = (app) => {
  // Admin Self Transaction API ("DONE")
  app.post(
    '/api/admin/deposit-amount/:adminId',
    depositAmountSchema,
    customErrorHandler,
    Authorize([stringConstructor.superAdmin]),
    depositTransaction,
  );

  // Transfer Amount API ("DONE")
  app.post(
    '/api/transfer-amount/:adminId',
    transferAmountSchema,
    customErrorHandler,
    Authorize([
      stringConstructor.superAdmin,
      stringConstructor.whiteLabel,
      stringConstructor.hyperAgent,
      stringConstructor.superAgent,
      stringConstructor.transferBalance,
    ]),
    transferAmount,
  );

  // Transaction View API ("DONE")
  app.get(
    '/api/transaction-view/:userName',
    transactionViewSchema,
    customErrorHandler,
    Authorize([
      stringConstructor.superAdmin,
      stringConstructor.whiteLabel,
      stringConstructor.hyperAgent,
      stringConstructor.superAgent,
      stringConstructor.masterAgent,
      stringConstructor.accountStatement,
    ]),
    transactionView,
  );

  // Account Statement API ("DONE")
  app.get(
    '/api/admin/account-statement/:adminId',
    accountStatementSchema,
    customErrorHandler,
    Authorize([
      stringConstructor.superAdmin,
      stringConstructor.whiteLabel,
      stringConstructor.hyperAgent,
      stringConstructor.superAgent,
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
    accountStatement,
  );

  // View Balance API ("DONE")
  app.get(
    '/api/view-balance/:adminId',
    viewBalanceSchema,
    customErrorHandler,
    Authorize([
      stringConstructor.superAdmin,
      stringConstructor.whiteLabel,
      stringConstructor.hyperAgent,
      stringConstructor.superAgent,
      stringConstructor.masterAgent,
      stringConstructor.subAdmin,
      stringConstructor.subWhiteLabel,
      stringConstructor.subHyperAgent,
      stringConstructor.subSuperAgent,
      stringConstructor.subMasterAgent,
    ]),
    viewBalance,
  );
};
