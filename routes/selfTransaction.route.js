import { accountStatement, depositTransaction, transactionView, transferAmount, viewBalance } from "../controller/selfTransaction.controller.js";
import customErrorHandler from "../helper/customErrorHandler.js";
import { Authorize } from "../middleware/auth.js";
import { accountStatementSchema, depositAmountSchema, transactionViewSchema, transferAmountSchema, viewBalanceSchema } from "../schema/commonSchema.js";


export const selfTransactionRoute = (app) => {
    // Admin Self Transaction API ("DONE")
    app.post(
        '/api/admin/deposit-amount/:adminId',
        Authorize(['superAdmin']),
        depositAmountSchema,
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
}