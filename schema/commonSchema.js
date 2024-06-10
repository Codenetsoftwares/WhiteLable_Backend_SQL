import { body, param, query } from 'express-validator';


export const createAdminSchema = [
  body('userName').trim().notEmpty().withMessage('User Name is required'),
  body('password').trim().notEmpty().withMessage('Password is required'),
  // body('roles')
  //   .isArray({ min: 1 })
  //   .withMessage('At least one role is required')
  //   .custom((value) => {
  //     if (value.some(role => !role.role || role.role.trim() === '')) {
  //       throw new Error('Role cannot be blank or empty');
  //     }
  //     return true;
  //   })
];

export const createSubAdminSchema = [
  body('userName').trim().notEmpty().withMessage('User Name is required'),
  body('password').trim().notEmpty().withMessage('Password is required'),
  // body('roles')
  //   .isArray({ min: 1 })
  //   .withMessage('At least one permission is required')
  //   .custom((value) => {
  //     if (value.some(role => !role.permission || role.permission.trim() === '')) {
  //       throw new Error('Permission cannot be empty');
  //     }
  //     return true;
  //   })
];

export const adminLoginSchema = [
  body('userName').trim().notEmpty().withMessage('User Name is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

export const adminPasswordResetSchema = [
  body('userName').trim().notEmpty().withMessage('User Name is required'),
  body('password').notEmpty().withMessage('Password is required'),
  body('oldPassword').notEmpty().withMessage('oldPassword is required'),
];

export const depositAmountSchema = [
  param('adminId').exists().withMessage('Admin ID is required.'),
  body('amount').exists().withMessage('Amount is required'),
];

export const transferAmountSchema = [
  param('adminId').exists().withMessage('Admin ID is required.'),
  body('receiveUserId').exists().withMessage('Receiver ID is required.'),
  body('transferAmount').exists().withMessage('Transfer Amount is required'),
  body('withdrawalAmt').exists().withMessage('Withdraw Amount is required'),
  body('remarks').exists().withMessage('Remark is required'),
  body('password').trim().notEmpty().withMessage('Password is required'),
];

export const transactionViewSchema = [
  param('userName').exists().withMessage('User Name is required.'),
  query('page').optional().toInt().isInt({ min: 1 }).withMessage('Page number must be a positive integer.'),
  query('limit').optional().toInt().isInt({ min: 1 }).withMessage('Limit must be a positive integer.'),
];
export const viewAllCreatesSchema = [
  param('createdById').exists().withMessage('Id is required.'),
  query('page').optional().toInt().isInt({ min: 1 }).withMessage('Page number must be a positive integer.'),
  query('limit').optional().toInt().isInt({ min: 1 }).withMessage('Limit must be a positive integer.'),
];

export const viewAllSubAdminCreatesSchema = [
  param('createdById').exists().withMessage('Id is required.'),
  query('page').optional().toInt().isInt({ min: 1 }).withMessage('Page number must be a positive integer.'),
  query('limit').optional().toInt().isInt({ min: 1 }).withMessage('Limit must be a positive integer.'),
];

export const viewBalanceSchema = [param('adminId').exists().withMessage('Admin Id is required.')];

export const creditRefSchema = [
  param('adminId').exists().withMessage('Admin Id is required.'),
  body('creditRef').isNumeric().withMessage('CreditRef must be a number'),
  body('password').notEmpty().withMessage('Password is required')
];

export const moveToTrashSchema = [body('requestId').exists().withMessage('Request Id is required')];

export const deleteFromTrashSchema = [param('trashId').exists().withMessage('Trash Id is required')];

export const activeStatusSchema = [param('adminId').exists().withMessage('Admin Id is required')];

export const restoreAdminUserSchema = [body('adminId').exists().withMessage('Admin Id is required.')];

export const profileViewSchema = [param('userName').exists().withMessage('User Name is required.')];

export const partnershipEditSchema = [
  param('adminId').exists().withMessage('Admin Id is required.'),
  body('partnership').isNumeric().withMessage('Partnership must be a number'),
  body('password').notEmpty().withMessage('Password is required')
];

export const partnershipViewSchema = [param('adminId').exists().withMessage('Admin Id is required.')];

export const creditRefViewSchema = [param('adminId').exists().withMessage('Admin Id is required.')];

export const rootPathSchema = [
  param('userName').exists().withMessage('User Name is required.'),
  param('action').exists().withMessage('Action is required.'),
];

export const viewSubAdminSchema = [
  param('adminId').exists().withMessage('Id is required.'),
  query('page').optional().toInt().isInt({ min: 1 }).withMessage('Page number must be a positive integer.'),
  query('limit').optional().toInt().isInt({ min: 1 }).withMessage('Limit must be a positive integer.'),
];

export const singleSubAdminSchema = [param('adminId').exists().withMessage('Admin Id is required.')];

export const subAdminPermissionSchema = [
  param('adminId').exists().withMessage('Admin Id is required'),
  body('permission').exists().withMessage('Permission is required'),
];

export const accountStatementSchema = [
  param('adminId').exists().withMessage('Id is required.'),
  query('page').optional().toInt().isInt({ min: 1 }).withMessage('Page number must be a positive integer.'),
  query('limit').optional().toInt().isInt({ min: 1 }).withMessage('Limit must be a positive integer.'),
];

export const userStatusSchema = [param('userName').exists().withMessage('User Name is required.')];
