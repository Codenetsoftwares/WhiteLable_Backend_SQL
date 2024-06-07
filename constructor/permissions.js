class PermissionConst {
    constructor() {
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
        this.viewSubAdmin = 'view-subAdmin';
    }
}

export const permission = new PermissionConst();
