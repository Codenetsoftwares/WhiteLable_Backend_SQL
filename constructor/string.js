class stringConst {
    constructor() {
        this.superAdmin = 'superAdmin';
        this.whiteLabel = 'whiteLabel';
        this.hyperAgent = 'hyperAgent';
        this.superAgent = 'superAgent';
        this.masterAgent = 'masterAgent';
        this.subWhiteLabel = 'subWhiteLabel';
        this.subAdmin = 'subAdmin';
        this.user = 'user'
        this.subHyperAgent = 'subHyperAgent';
        this.subSuperAgent = 'subSuperAgent';
        this.subMasterAgent = 'subMasterAgent';
        this.createAdmin = 'create-Admin';
        this.createSubAdmin = 'create-subAdmin';
        this.transferBalance = 'transferBalance';
        this.status = 'status';
        this.creditRefEdit = 'creditRef-Edit';
        this.partnershipEdit = 'partnership-Edit';
        this.creditRefView = 'creditRef-View';
        this.partnershipView = 'partnership-view';
        this.userProfileView = 'user-profile-view';
        this.profileView = 'profile-view';
        this.viewAdminData = 'view-admin-data';
        this.createUser = 'create-user';
        this.accountStatement = 'accountStatement';
        this.activityLog = 'activityLog';
        this.deleteAdmin = 'delete-admin';
        this.restoreAdmin = 'restore-admin';
        this.moveToTrash = 'move-to-trash';
        this.trashView = 'trash-view';
        this.viewSubAdmin = 'view-subAdmin'
    }
}

export const string = new stringConst();

class ResponseMessages {
    constructor() {
        this.adminCreated = 'Admin created successfully';
        this.subAdminCreated = 'Sub Admin created successfully';
        this.adminExists = 'Admin already exists';
        this.userExists = 'User Already Exist';
        this.accountInactive = 'Account is in Inactive Mode';
        this.invalidRole = 'Invalid user role for creating sub-admin';
        this.adminNotFound = 'Admin not found';
        this.noRecordsFound = 'No records found';
        this.success = 'Success';
        this.dataFetched = 'Data Fetched';
        this.somethingWentWrong = 'Something went wrong';
        this.invalidPassword = 'Invalid password';
        this.inActiveAdmin = 'Admin is Suspended or Locked';
        this.invalidCreditRes = 'Invalid creditRefs data';
        this.invalidPartnership = 'Invalid partnerships data';
        this.numberPartnership = 'Partnership must be a number'
        this.userNotFound = 'User not found';

    }
}

export const messages = new ResponseMessages();