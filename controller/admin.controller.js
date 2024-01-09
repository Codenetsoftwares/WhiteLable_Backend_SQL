import bcrypt from "bcrypt"
import jwt from "jsonwebtoken";
import { Admin } from "../models/admin.model.js";
import { User } from "../models/user.model.js";
import { Trash } from "../models/trash.model.js";


const globalUsernames = [];

export const AdminController = {
    createAdmin: async (data, user) => {
        try {
            if (!data.userName) {
                throw { message: "userName Is Required" };
            }
            if (!data.password) {
                throw { message: "Password Is Required" };
            }
            if (!data.roles || !Array.isArray(data.roles) || data.roles.length === 0) {
                throw { code: 400, message: "Roles is required" };
            }

            const existingAdmin = await Admin.findOne({ userName: data.userName });
            if (existingAdmin) {
                throw { code: 409, message: "Admin Already Exists" };
            }
            if (user.isActive === false || user.locked === false) {
                throw { code: 400, message: "Account is Not Active" };
            }
            const Passwordsalt = await bcrypt.genSalt();
            const encryptedPassword = await bcrypt.hash(data.password, Passwordsalt);
    
            const defaultPermission = "All Accesses";
    
            const rolesWithDefaultPermission = data.roles.map(role => ({
                role,
                permission: defaultPermission,
            }));
    
            const newAdmin = new Admin({
            userName: data.userName,
            password: encryptedPassword,
            roles: rolesWithDefaultPermission,
            createBy: user._id, 
            createUser: user.userName,
        });

        const isSubRole = ["SubAdmin", "SubWhiteLabel", "SubHyperAgent", "SubSuperAgent", "SubMasterAgent"].includes(user.roles[0].role);
        if (isSubRole) {
            newAdmin.createBy = user.createBy || user._id;
        }

        await newAdmin.save();
    } catch (err) {
        console.error(err);
        throw { code: 500, message: "Failed to save user" };
    }
},
    

    createSubAdmin: async (data, user) => {
        if (!data.userName) {
            throw { message: "userName Is Required" };
        }
        if (!data.password) {
            throw { message: "Password Is Required" };
        }
        // if (!data.roles || !Array.isArray(data.roles) || data.roles.length === 0) {
        //     throw { code: 400, message: "Roles is required" };
        // }
        if (user.isActive === false) {
            throw { code: 400, message: "Account is in Inactive Mode" };
        }
    
        const existingAdmin = await Admin.findOne({ userName: data.userName });
        if (existingAdmin) {
            throw { code: 409, message: "Admin Already Exist" };
        }
    
        const Passwordsalt = await bcrypt.genSalt();
        const encryptedPassword = await bcrypt.hash(data.password, Passwordsalt);
    
        let subRole = '';
        console.log('userRoels',user.roles);
        for(let i=0; i<user.roles.length; i++){
            if (user.roles[i].role.includes('superAdmin')) {
                subRole = 'SubAdmin';
            } else if (user.roles[i].role.includes('WhiteLabel')) {
                subRole = 'SubWhiteLabel';
            } else if (user.roles[i].role.includes('HyperAgent')) {
                subRole = 'SubHyperAgent';
            } else if (user.roles[i].role.includes('SuperAgent')) {
                subRole = 'SubSuperAgent';
            } else if (user.roles[i].role.includes('MasterAgent')) {
                subRole = 'SubMasterAgent';
            } else {
                throw { code: 400, message: "Invalid user role for creating sub-admin" };
            }
        }
    
        const newAdmin = new Admin({
            userName: data.userName,
            password: encryptedPassword,
            roles: [{ role: subRole, permission: data.permission }],
            createBy: user._id,
            createUser : user.username,
        });
        try {
            await newAdmin.save();
            return newAdmin;
        } catch (err) {
            console.error(err);
            throw { code: 500, message: "Failed to save user" };
        }
    },

    GenerateAdminAccessToken: async (userName, password, persist) => {
        if (!userName) {
            throw { code: 400, message: "Invalid value for: User Name" };
        }
        if (!password) {
            throw { code: 400, message: "Invalid value for: password" };
        }
        const existingUser = await AdminController.findAdmin({
            userName: userName,
        });
        if (!existingUser) {
            throw { code: 401, message: "Invalid User Name or password" };
        }

        if (existingUser.locked === false) {
            throw { code: 401, message: "User Account is Locked" };
        }
        const passwordValid = await bcrypt.compare(password, existingUser.password);
        if (!passwordValid) {
            throw { code: 401, message: "Invalid User Name or Password" };
        }

    const accessTokenResponse = {
        id: existingUser._id,
        createBy:existingUser.createBy,
        userName: existingUser.userName,
        roles: existingUser.roles.map(role => ({
            role: role.role,
            permission: role.permission
        }))
    };

    const accessToken = jwt.sign(
        accessTokenResponse,
        process.env.JWT_SECRET_KEY,
        {
            expiresIn: persist ? "1y" : "8h",
        }
    );

    return {
        userName: existingUser.userName,
        accessToken: accessToken,
        roles: existingUser.roles.map(role => ({
            role: role.role,
            permission: role.permission
        })),
        balance: existingUser.balance,
        loadBalance: existingUser.loadBalance,
        isActive: existingUser.isActive
    };
},

    findAdminById: async (id) => {
        if (!id) {
            throw { code: 409, message: "Required parameter: id" };
        }

        return Admin.findById(id).exec();
    },

    findAdmin: async (filter) => {
        if (!filter) {
            throw { code: 409, message: "Required parameter: filter" };
        }
        return Admin.findOne(filter).exec();
    },

    PasswordResetCode: async (userName, oldPassword, password) => {
        const existingUser = await AdminController.findAdmin({
            userName: userName,
        });
        const oldPasswordIsCorrect = await bcrypt.compare(
            oldPassword,
            existingUser.password
          );
          if (!oldPasswordIsCorrect) {
            throw {
              code: 401,
              message: "Invalid old password",
            };
          }
          const passwordIsDuplicate = await bcrypt.compare(
            password,
            existingUser.password
          );
          if (passwordIsDuplicate) {
            throw {
              code: 409,
              message: "New Password Cannot Be The Same As Existing Password",
            };
          }
          const passwordSalt = await bcrypt.genSalt();
          const encryptedPassword = await bcrypt.hash(password, passwordSalt);
          existingUser.password = encryptedPassword;
          existingUser.save().catch((err) => {
            console.error(err);
            throw { code: 500, message: "Failed to save new password" };
          });
      
          return true;
    },

    //create user

    CreateUser: async (data) => {
        try {
        const existingUser = await User.findOne({ userName: data.userName })
   
        if (existingUser) {
            throw ({ code: 409, message: "User Already Exist" })
        }
        if (!data.userName) {
            throw ({ message: "userName Is Required" })
        }
        if (!data.password) {
            throw ({ message: "Password Is Required" })
        }

        const Passwordsalt = await bcrypt.genSalt();
        const encryptedPassword = await bcrypt.hash(data.password, Passwordsalt);
        const newUser = new User({
            userName: data.userName,
            password: encryptedPassword,

        });
        newUser.save()
    }
    catch(err) {
            console.error(err);
            throw { code: 500, message: "Failed to save User" };
        };
    },

    // Deposit Amount 

    Deposit: async (adminId, depositAmount) => {
        try {
            const admin = await Admin.findById(adminId).exec();

            if (!admin) {
                throw { code: 404, message: "Admin Not Found For Deposit" };
            }
            // const isPasswordValid = await bcrypt.compare(password, admin.password);

            // if (!isPasswordValid) {
            //     throw { code: 401, message: "Invalid password for the deposit" };
            // }

            admin.depositBalance += depositAmount;
            admin.balance += depositAmount;

            await admin.save();

            return { message: "Balance Deposit Successfully" };
        } catch (err) {
            throw { code: err.code, message: err.message };
        }
    },

// transfer amount
    transferAmountadmin: async (userId, receiveUserId, trnsfAmnt, withdrawlAmt, remarks,password) => 
    {
        try {
            const sender = await Admin.findById({ _id: userId }).exec();
    
            if (!sender) {
                throw { code: 404, message: "Admin Not Found For Transfer" };
            }
    
            const isPasswordValid = await bcrypt.compare(password, sender.password);
    
            if (!isPasswordValid) {
                throw { code: 401, message: "Invalid password for the transaction" };
            }
    
            const receiver = await Admin.findById({ _id: receiveUserId }).exec();
    
            if (!receiver) {
                throw { code: 404, message: "Receive User Not Found" };
            }
    
            if (!sender.isActive) {
                throw { code: 404, message: 'Sender is inactive' };
            }
    
            if (!receiver.isActive) {
                throw { code: 404, message: 'Receiver is inactive' };
            }
    
            if (withdrawlAmt && withdrawlAmt > 0) {
                if (receiver.balance < withdrawlAmt) {
                    throw { code: 400, message: "Insufficient Balance For Withdrawal" };
                }
    
                const withdrawalRecord = {
                    transactionType: "Withdrawal",
                    withdraw: withdrawlAmt,
                    From: receiver.userName,
                    To: sender.userName,
                    date: new Date(),
                    remarks: remarks
                };
    
                receiver.balance -= withdrawlAmt;
                receiver.loadBalance -= withdrawlAmt;
                sender.balance += withdrawlAmt;
                sender.transferAmount.push(withdrawalRecord);
            } else {
                if (sender.balance < trnsfAmnt) {
                    throw { code: 400, message: "Insufficient Balance For Transfer" };
                }
    
                const transferRecordDebit = {
                    transactionType: "Debit",
                    amount: trnsfAmnt,
                    From: sender.userName,
                    To: receiver.userName,
                    date: new Date(),
                    remarks: remarks
                };
    
                const transferRecordCredit = {
                    transactionType: "Credit",
                    amount: trnsfAmnt,
                    From: sender.userName,
                    To: receiver.userName,
                    date: new Date(),
                    remarks: remarks
                };
    
                console.log("Transfer: " + trnsfAmnt);
                console.log("Withdrawal: " + withdrawlAmt);
    
                sender.remarks = remarks;
                sender.balance -= trnsfAmnt;
                receiver.balance += trnsfAmnt;
                receiver.loadBalance += trnsfAmnt;
                // receiver.loadBalance -= trnsfAmnt;
                receiver.transferAmount.push(transferRecordCredit);
                sender.transferAmount.push(transferRecordDebit);
            }
    
            if (!sender.transferAmount) {
                sender.transferAmount = [];
            }
    
            await sender.save();
            await receiver.save();
    
            return { message: "Balance Transfer Successfully" };
        } catch (err) {
            throw { code: err.code, message: err.message };
        }
    },
    


    // User Active status

    activateAdmin: async (adminId, isActive, locked) => {
        try {
        console.log("adminId:", adminId); 
        const admin = await Admin.findById(adminId);
        
        const whiteLabel = await Admin.find({ createBy: adminId, roles: { $elemMatch: { role: "WhiteLabel" } } }).exec();
        const hyperAgent = await Admin.find({ createBy: adminId, roles: { $elemMatch: { role: "HyperAgent" } } }).exec();
        const masterAgent = await Admin.find({ createBy: adminId, roles: { $elemMatch: { role: "MasterAgent" } } }).exec();
        const superAgent = await Admin.find({ createBy: adminId, roles: { $elemMatch: { role: "SuperAgent" } } }).exec();
        const subwhiteLabel = await Admin.find({ createBy: adminId, roles: { $elemMatch: { role: "SubWhiteLabel" } } }).exec();
        const subhyperAgent = await Admin.find({ createBy: adminId, roles: { $elemMatch: { role: "SubHyperAgent" } } }).exec();
        const submasterAgent = await Admin.find({ createBy: adminId, roles: { $elemMatch: { role: "SubMasterAgent" } } }).exec();
        const subsuperAgent = await Admin.find({ createBy: adminId, roles: { $elemMatch: { role: "SubSuperAgent" } } }).exec();
        
        
        
        if (whiteLabel.length == 0 && hyperAgent.length == 0 && masterAgent.length == 0 && superAgent.length == 0
             && subwhiteLabel.length == 0 && subhyperAgent.length == 0 && submasterAgent.length == 0 && subsuperAgent.length == 0) {
            if (isActive === true) {
                admin.isActive = true;
                admin.locked = true;
            }
            else if (isActive === false) {
                if (locked === false) {
                    admin.locked = false;
                    admin.isActive = false;
                }
                else {
                    admin.isActive = false;  
                    admin.locked = true;       
                }
            }
            
            await admin.save();
            await Promise.all(hyperAgent.map(data => data.save()));
            await Promise.all(masterAgent.map(data => data.save()));
            await Promise.all(whiteLabel.map(data => data.save()));
            await Promise.all(superAgent.map(data => data.save()));
            await Promise.all(subhyperAgent.map(data => data.save()));
            await Promise.all(submasterAgent.map(data => data.save()));
            await Promise.all(subwhiteLabel.map(data => data.save()));
            await Promise.all(subsuperAgent.map(data => data.save()));
            return
        }
        if (!admin) {
            throw { code: 404, message: "Admin not found" };
        }
        if (isActive === true) {
            admin.isActive = true;
            admin.locked = true;
            superAgent.map((data) => {
                if (data.isActive === false && data.locked === false && data.superActive === true && data.checkActive === true) {
                
                    data.isActive = true;
                    data.locked = true;
                    data.superActive = false;
                    data.checkActive = false;
                } //checked
                else if (data.isActive === false && data.locked === false && data.superActive === true && data.checkActive === false) {
                
                    data.locked = true;
                    data.superActive = false;
                } //checked
                else if (data.isActive === false && data.locked === true && data.superActive === true && data.checkActive === true) {
                
                    data.isActive = true;
                    data.locked = true;
                    data.superActive = false;
                    data.checkActive = false;
                } //checked
                AdminController.activateAdmin(data._id, data.isActive, data.locked)
        
            })
        
            hyperAgent.forEach((data) => {
                if (data.isActive === false && data.locked === false && data.hyperActive === true && data.checkActive === true) {
                
                    data.isActive = true;
                    data.locked = true;
                    data.hyperActive = false;
                    data.checkActive = false;
                } //checked
                else if (data.isActive === false && data.locked === false && data.hyperActive === true && data.checkActive === false) {
                
                    data.locked = true;
                    data.hyperActive = false;
                } //checked
                else if (data.isActive === false && data.locked === true && data.hyperActive === true && data.checkActive === true) {
                    
                    data.isActive = true;
                    data.locked = true;
                    data.hyperActive = false;
                    data.checkActive = false;
                } //checked
        
                AdminController.activateAdmin(data._id, data.isActive, data.locked)
        
        
            })
            masterAgent.forEach((data) => {
                if (data.isActive === false && data.locked === false && data.masterActive === true && data.checkActive === true) {
                
                    data.isActive = true;
                    data.locked = true;
                    data.masterActive = false;
                    data.checkActive = false;
                } //checked
                else if (data.isActive === false && data.locked === false && data.masterActive === true && data.checkActive === false) {
                
                    data.locked = true;
                    data.masterActive = false;
                } //checked
                else if (data.isActive === false && data.locked === true && data.masterActive === true && data.checkActive === true) {
                    
                    data.isActive = true;
                    data.locked = true;
                    data.masterActive = false;
                    data.checkActive = false;
                } //checked
        
                AdminController.activateAdmin(data._id, data.isActive, data.locked)
        
        
            })
            whiteLabel.forEach((data) => {
                if (data.isActive === false && data.locked === false && data.whiteActive === true && data.checkActive === true) {
                
                    data.isActive = true;
                    data.locked = true;
                    data.whiteActive = false;
                    data.checkActive = false;
                } //checked
                else if (data.isActive === false && data.locked === false && data.whiteActive === true && data.checkActive === false) {
                
                    data.locked = true;
                    data.whiteActive = false;
                } //checked
                else if (data.isActive === false && data.locked === true && data.whiteActive === true && data.checkActive === true) {
                
                    data.isActive = true;
                    data.locked = true;
                    data.whiteActive = false;
                    data.checkActive = false;
                } //checked
                AdminController.activateAdmin(data._id, data.isActive, data.locked)
        
        
        
            })


            // added sub


            subsuperAgent.map((data) => {
                if (data.isActive === false && data.locked === false && data.subsuperActive === true && data.checkActive === true) {
                
                    data.isActive = true;
                    data.locked = true;
                    data.subsuperActive = false;
                    data.checkActive = false;
                } //checked
                else if (data.isActive === false && data.locked === false && data.subsuperActive === true && data.checkActive === false) {
                
                    data.locked = true;
                    data.subsuperActive = false;
                } //checked
                else if (data.isActive === false && data.locked === true && data.subsuperActive === true && data.checkActive === true) {
                
                    data.isActive = true;
                    data.locked = true;
                    data.subsuperActive = false;
                    data.checkActive = false;
                } //checked
                AdminController.activateAdmin(data._id, data.isActive, data.locked)
        
            })
        
            subhyperAgent.forEach((data) => {
                if (data.isActive === false && data.locked === false && data.subhyperActive === true && data.checkActive === true) {
                
                    data.isActive = true;
                    data.locked = true;
                    data.subhyperActive = false;
                    data.checkActive = false;
                } //checked
                else if (data.isActive === false && data.locked === false && data.subhyperActive === true && data.checkActive === false) {
                
                    data.locked = true;
                    data.subhyperActive = false;
                } //checked
                else if (data.isActive === false && data.locked === true && data.subhyperActive === true && data.checkActive === true) {
                    
                    data.isActive = true;
                    data.locked = true;
                    data.subhyperActive = false;
                    data.checkActive = false;
                } //checked
        
                AdminController.activateAdmin(data._id, data.isActive, data.locked)
        
        
            })
            submasterAgent.forEach((data) => {
                if (data.isActive === false && data.locked === false && data.submasterActive === true && data.checkActive === true) {
                
                    data.isActive = true;
                    data.locked = true;
                    data.submasterActive = false;
                    data.checkActive = false;
                } //checked
                else if (data.isActive === false && data.locked === false && data.submasterActive === true && data.checkActive === false) {
                
                    data.locked = true;
                    data.submasterActive = false;
                } //checked
                else if (data.isActive === false && data.locked === true && data.submasterActive === true && data.checkActive === true) {
                    
                    data.isActive = true;
                    data.locked = true;
                    data.submasterActive = false;
                    data.checkActive = false;
                } //checked
        
                AdminController.activateAdmin(data._id, data.isActive, data.locked)
        
        
            })
            subwhiteLabel.forEach((data) => {
                if (data.isActive === false && data.locked === false && data.subwhiteActive === true && data.checkActive === true) {
                
                    data.isActive = true;
                    data.locked = true;
                    data.subwhiteActive = false;
                    data.checkActive = false;
                } //checked
                else if (data.isActive === false && data.locked === false && data.subwhiteActive === true && data.checkActive === false) {
                
                    data.locked = true;
                    data.subwhiteActive = false;
                } //checked
                else if (data.isActive === false && data.locked === true && data.subwhiteActive === true && data.checkActive === true) {
                
                    data.isActive = true;
                    data.locked = true;
                    data.subwhiteActive = false;
                    data.checkActive = false;
                } //checked
                AdminController.activateAdmin(data._id, data.isActive, data.locked)
        
        
        
            })
        
        
            await admin.save();
            await Promise.all(hyperAgent.map(data => data.save()));
            await Promise.all(masterAgent.map(data => data.save()));
            await Promise.all(whiteLabel.map(data => data.save()));
            await Promise.all(superAgent.map(data => data.save()));
            await Promise.all(subhyperAgent.map(data => data.save()));
            await Promise.all(submasterAgent.map(data => data.save()));
            await Promise.all(subwhiteLabel.map(data => data.save()));
            await Promise.all(subsuperAgent.map(data => data.save()));
            return { message: "Admin Activated Successfully" };
        }
        else if (isActive === false) {
            if (locked === false) {
                admin.locked = false;
                admin.isActive = false;
            
        
                superAgent.forEach((data) => {
        
                    if (data.isActive === true && data.locked === true && data.superActive === false && data.checkActive === false) {
                    
                        data.isActive = false;
                        data.locked = false;
                        data.superActive = true;
                        data.checkActive = true
                    } //checked
        
                    else if (data.isActive === false && data.locked === true && data.superActive === true) {
                        data.isActive = false;
                        data.locked = false;
                        data.checkActive = true;
            
                    }
                    else if (data.isActive === false && data.locked === true && data.superActive === false && data.checkActive === false) {
                        data.locked = false;
                        data.superActive = true;
                
                    } //checked
                    else if (data.isActive === false && data.locked === true && data.superActive === true && data.checkActive === true) {
                        data.locked = false;
                
                    } //checked
                    else if (data.isActive === false && data.locked === false && data.superActive === true && data.checkActive === true) {
                        data.isActive = true;
                        data.locked = true;
                        data.superActive = false;
                        data.checkActive === false
                    }
                    AdminController.activateAdmin(data._id, data.isActive, data.locked)
        
                });
                hyperAgent.forEach((data) => {
                    if (data.isActive === true && data.locked === true && data.hyperActive === false && data.checkActive === false) {
                    
                        data.isActive = false;
                        data.locked = false;
                        data.hyperActive = true;
                        data.checkActive = true
                    } //checked
        
                    else if (data.isActive === false && data.locked === true && data.hyperActive === true) {
                        data.isActive = false;
                        data.locked = false;
                        data.checkActive = true;
                    
                    }
                    else if (data.isActive === false && data.locked === true && data.hyperActive === false && data.checkActive === false) {
                        data.locked = false;
                        data.hyperActive = true;
                    
                    } //checked
                    else if (data.isActive === false && data.locked === true && data.hyperActive === true && data.checkActive === true) {
                        data.locked = false;
                    
                    } //checked
                    else if (data.isActive === false && data.locked === false && data.hyperActive === true && data.checkActive === true) {
                        data.isActive = true;
                        data.locked = true;
                        data.hyperActive = false;
                        data.checkActive === false
                    }
                    AdminController.activateAdmin(data._id, data.isActive, data.locked)
        
                });
                masterAgent.forEach((data) => {
                    if (data.isActive === true && data.locked === true && data.masterActive === false && data.checkActive === false) {
                    
                        data.isActive = false;
                        data.locked = false;
                        data.masterActive = true;
                        data.checkActive = true
                    } //checked
        
                    else if (data.isActive === false && data.locked === true && data.masterActive === true) {
                        data.isActive = false;
                        data.locked = false;
                        data.checkActive = true;
                
                    }
                    else if (data.isActive === false && data.locked === true && data.masterActive === false && data.checkActive === false) {
                        data.locked = false;
                        data.masterActive = true;
                    
                    } //checked
                    else if (data.isActive === false && data.locked === true && data.masterActive === true && data.checkActive === true) {
                        data.locked = false;
                
                    } //checked
                    else if (data.isActive === false && data.locked === false && data.masterActive === true && data.checkActive === true) {
                        data.isActive = true;
                        data.locked = true;
                        data.masterActive = false;
                        data.checkActive === false
                    }
                    AdminController.activateAdmin(data._id, data.isActive, data.locked)
        
                });
                whiteLabel.forEach((data) => {
                    if (data.isActive === true && data.locked === true && data.whiteActive === false && data.checkActive === false) {
                
                        data.isActive = false;
                        data.locked = false;
                        data.whiteActive = true;
                        data.checkActive = true
                    } //checked
        
                    else if (data.isActive === false && data.locked === true && data.whiteActive === true) { ///not use
                        data.isActive = false;
                        data.locked = false;
                        data.checkActive = true;
                
                    }
                    else if (data.isActive === false && data.locked === true && data.whiteActive === false && data.checkActive === false) {
                        data.locked = false;
                        data.whiteActive = true;
                
                    } //checked
                    else if (data.isActive === false && data.locked === true && data.whiteActive === true && data.checkActive === true) {///not use
                        data.locked = false;
                    
                    } //checked
                    else if (data.isActive === false && data.locked === false && data.whiteActive === true && data.checkActive === true) {
                        data.isActive = true;
                        data.locked = true;
                        data.whiteActive = false;
                        data.checkActive === false
                    }
                    AdminController.activateAdmin(data._id, data.isActive, data.locked)
        
                });


                // added sub 

                subsuperAgent.forEach((data) => {
        
                    if (data.isActive === true && data.locked === true && data.subsuperActive === false && data.checkActive === false) {
                    
                        data.isActive = false;
                        data.locked = false;
                        data.subsuperActive = true;
                        data.checkActive = true
                    } //checked
        
                    else if (data.isActive === false && data.locked === true && data.subsuperActive === true) {
                        data.isActive = false;
                        data.locked = false;
                        data.checkActive = true;
            
                    }
                    else if (data.isActive === false && data.locked === true && data.superActive === false && data.checkActive === false) {
                        data.locked = false;
                        data.subsuperActive = true;
                
                    } //checked
                    else if (data.isActive === false && data.locked === true && data.subsuperActive === true && data.checkActive === true) {
                        data.locked = false;
                
                    } //checked
                    else if (data.isActive === false && data.locked === false && data.subsuperActive === true && data.checkActive === true) {
                        data.isActive = true;
                        data.locked = true;
                        data.subsuperActive = false;
                        data.checkActive === false
                    }
                    AdminController.activateAdmin(data._id, data.isActive, data.locked)
        
                });
                subhyperAgent.forEach((data) => {
                    if (data.isActive === true && data.locked === true && data.subhyperActive === false && data.checkActive === false) {
                    
                        data.isActive = false;
                        data.locked = false;
                        data.subhyperActive = true;
                        data.checkActive = true
                    } //checked
        
                    else if (data.isActive === false && data.locked === true && data.subhyperActive === true) {
                        data.isActive = false;
                        data.locked = false;
                        data.checkActive = true;
                    
                    }
                    else if (data.isActive === false && data.locked === true && data.subhyperActive === false && data.checkActive === false) {
                        data.locked = false;
                        data.subhyperActive = true;
                    
                    } //checked
                    else if (data.isActive === false && data.locked === true && data.subhyperActive === true && data.checkActive === true) {
                        data.locked = false;
                    
                    } //checked
                    else if (data.isActive === false && data.locked === false && data.subhyperActive === true && data.checkActive === true) {
                        data.isActive = true;
                        data.locked = true;
                        data.subhyperActive = false;
                        data.checkActive === false
                    }
                    AdminController.activateAdmin(data._id, data.isActive, data.locked)
        
                });
                submasterAgent.forEach((data) => {
                    if (data.isActive === true && data.locked === true && data.submasterActive === false && data.checkActive === false) {
                    
                        data.isActive = false;
                        data.locked = false;
                        data.submasterActive = true;
                        data.checkActive = true
                    } //checked
        
                    else if (data.isActive === false && data.locked === true && data.submasterActive === true) {
                        data.isActive = false;
                        data.locked = false;
                        data.checkActive = true;
                
                    }
                    else if (data.isActive === false && data.locked === true && data.submasterActive === false && data.checkActive === false) {
                        data.locked = false;
                        data.submasterActive = true;
                    
                    } //checked
                    else if (data.isActive === false && data.locked === true && data.submasterActive === true && data.checkActive === true) {
                        data.locked = false;
                
                    } //checked
                    else if (data.isActive === false && data.locked === false && data.submasterActive === true && data.checkActive === true) {
                        data.isActive = true;
                        data.locked = true;
                        data.submasterActive = false;
                        data.checkActive === false
                    }
                    AdminController.activateAdmin(data._id, data.isActive, data.locked)
        
                });
                subwhiteLabel.forEach((data) => {
                    if (data.isActive === true && data.locked === true && data.subwhiteActive === false && data.checkActive === false) {
                
                        data.isActive = false;
                        data.locked = false;
                        data.subwhiteActive = true;
                        data.checkActive = true
                    } //checked
        
                    else if (data.isActive === false && data.locked === true && data.subwhiteActive === true) { ///not use
                        data.isActive = false;
                        data.locked = false;
                        data.checkActive = true;
                
                    }
                    else if (data.isActive === false && data.locked === true && data.subwhiteActive === false && data.checkActive === false) {
                        data.locked = false;
                        data.subwhiteActive = true;
                
                    } //checked
                    else if (data.isActive === false && data.locked === true && data.subwhiteActive === true && data.checkActive === true) {///not use
                        data.locked = false;
                    
                    } //checked
                    else if (data.isActive === false && data.locked === false && data.subwhiteActive === true && data.checkActive === true) {
                        data.isActive = true;
                        data.locked = true;
                        data.subwhiteActive = false;
                        data.checkActive === false
                    }
                    AdminController.activateAdmin(data._id, data.isActive, data.locked)
        
                });
        
                await admin.save();
                await Promise.all(hyperAgent.map(data => data.save()));
                await Promise.all(masterAgent.map(data => data.save()));
                await Promise.all(whiteLabel.map(data => data.save()));
                await Promise.all(superAgent.map(data => data.save()));
                await Promise.all(subhyperAgent.map(data => data.save()));
                await Promise.all(submasterAgent.map(data => data.save()));
                await Promise.all(subwhiteLabel.map(data => data.save()));
                await Promise.all(subsuperAgent.map(data => data.save()));
                return { message: "Admin Locked Successfully" };
            } else {
            
                admin.isActive = false;
                admin.locked = true;
                superAgent.forEach((data) => {
                    if (data.isActive === true && data.locked === true && data.superActive === false) {
                        data.isActive = false;
                        data.locked = true;
                        data.superActive = true;
                        data.checkActive = true
                    }
                    else if (data.isActive === false && data.locked === false && data.superActive === true && data.checkActive === false) {
                        data.locked = true;
                        data.superActive = false;
                    }
                    else if (data.isActive === false && data.locked === false && data.superActive === true && data.checkActive === true) {
                        data.locked = true;
                    }
                    AdminController.activateAdmin(data._id, data.isActive, data.locked)
        
        
                });
                hyperAgent.forEach((data) => {
                    if (data.isActive === true && data.locked === true && data.hyperActive === false) {
                        data.isActive = false;
                        data.locked = true;
                        data.hyperActive = true;
                        data.checkActive = true
                    }
                    else if (data.isActive === false && data.locked === false && data.hyperActive === true && data.checkActive === false) {
                        data.locked = true;
                        data.hyperActive = false;
                    }
                    else if (data.isActive === false && data.locked === false && data.hyperActive === true && data.checkActive === true) {
                        data.locked = true;
                    }
        
                    AdminController.activateAdmin(data._id, data.isActive, data.locked)
        
        
                });
                masterAgent.forEach((data) => {
            
                    if (data.isActive === true && data.locked === true && data.masterActive === false) {
                        data.isActive = false;
                        data.locked = true;
                        data.masterActive = true;
                        data.checkActive = true
                    }
                    else if (data.isActive === false && data.locked === false && data.masterActive === true && data.checkActive === false) {
                        data.locked = true;
                        data.masterActive = false;
                    }
                    else if (data.isActive === false && data.locked === false && data.masterActive === true && data.checkActive === true) {
                        data.locked = true;
                    }
                    AdminController.activateAdmin(data._id, data.isActive, data.locked)
        
        
                });
                whiteLabel.forEach((data) => {
                    if (data.isActive === true && data.locked === true && data.whiteActive === false) {
                        data.isActive = false;
                        data.locked = true;
                        data.whiteActive = true;
                        data.checkActive = true
                    }
                    else if (data.isActive === false && data.locked === false && data.whiteActive === true && data.checkActive === false) {
                        data.locked = true;
                        data.whiteActive = false;
                    }
                    else if (data.isActive === false && data.locked === false && data.whiteActive === true && data.checkActive === true) {
                        data.locked = true;
                    }
                    AdminController.activateAdmin(data._id, data.isActive, data.locked)
        
        
                });


                // added sub 

                subsuperAgent.forEach((data) => {
                    if (data.isActive === true && data.locked === true && data.subsuperActive === false) {
                        data.isActive = false;
                        data.locked = true;
                        data.subsuperActive = true;
                        data.checkActive = true
                    }
                    else if (data.isActive === false && data.locked === false && data.subsuperActive === true && data.checkActive === false) {
                        data.locked = true;
                        data.subsuperActive = false;
                    }
                    else if (data.isActive === false && data.locked === false && data.subsuperActive === true && data.checkActive === true) {
                        data.locked = true;
                    }
                    AdminController.activateAdmin(data._id, data.isActive, data.locked)
        
        
                });
                subhyperAgent.forEach((data) => {
                    if (data.isActive === true && data.locked === true && data.subhyperActive === false) {
                        data.isActive = false;
                        data.locked = true;
                        data.subhyperActive = true;
                        data.checkActive = true
                    }
                    else if (data.isActive === false && data.locked === false && data.subhyperActive === true && data.checkActive === false) {
                        data.locked = true;
                        data.subhyperActive = false;
                    }
                    else if (data.isActive === false && data.locked === false && data.subhyperActive === true && data.checkActive === true) {
                        data.locked = true;
                    }
        
                    AdminController.activateAdmin(data._id, data.isActive, data.locked)
        
        
                });
                submasterAgent.forEach((data) => {
            
                    if (data.isActive === true && data.locked === true && data.submasterActive === false) {
                        data.isActive = false;
                        data.locked = true;
                        data.submasterActive = true;
                        data.checkActive = true
                    }
                    else if (data.isActive === false && data.locked === false && data.submasterActive === true && data.checkActive === false) {
                        data.locked = true;
                        data.submasterActive = false;
                    }
                    else if (data.isActive === false && data.locked === false && data.submasterActive === true && data.checkActive === true) {
                        data.locked = true;
                    }
                    AdminController.activateAdmin(data._id, data.isActive, data.locked)
        
        
                });
                subwhiteLabel.forEach((data) => {
                    if (data.isActive === true && data.locked === true && data.subwhiteActive === false) {
                        data.isActive = false;
                        data.locked = true;
                        data.subwhiteActive = true;
                        data.checkActive = true
                    }
                    else if (data.isActive === false && data.locked === false && data.subwhiteActive === true && data.checkActive === false) {
                        data.locked = true;
                        data.subwhiteActive = false;
                    }
                    else if (data.isActive === false && data.locked === false && data.subwhiteActive === true && data.checkActive === true) {
                        data.locked = true;
                    }
                    AdminController.activateAdmin(data._id, data.isActive, data.locked)
        
        
                });

                await admin.save();
                await Promise.all(hyperAgent.map(data => data.save()));
                await Promise.all(masterAgent.map(data => data.save()));
                await Promise.all(whiteLabel.map(data => data.save()));
                await Promise.all(superAgent.map(data => data.save()));
                await Promise.all(subhyperAgent.map(data => data.save()));
                await Promise.all(submasterAgent.map(data => data.save()));
                await Promise.all(subwhiteLabel.map(data => data.save()));
                await Promise.all(subsuperAgent.map(data => data.save()));
        
                return { message: "Admin Suspended Successfully" };
            }
        } 
        
        } catch (err) {
        throw { code: err.code || 500, message: err.message || "Internal Server Error" };
        }
        },

   editCreditRef: async (adminId, creditRef,password) => {
    try {
        const admin = await Admin.findById(adminId);

        if (!admin) {
            throw { code: 404, message: "Admin not found" };
        }
        const isPasswordValid = await bcrypt.compare(password, admin.password);

        if (!isPasswordValid) {
            throw { code: 401, message: "Invalid password " };
        }

        if (!admin.locked){
            throw { code: 404, message: 'Admin is Suspend or Locked' };
        }
        if( !admin.isActive) {
            throw { code: 404, message: 'Admin is Suspend or Locked' };
        }

        const newcreditRefEntry = {
            value: creditRef,
            date: new Date(),
        };

        admin.creditRef.push(newcreditRefEntry);


        if (admin.creditRef.length > 10) {
            admin.creditRef.shift();
        }

        const updatedAdmin = await admin.save();

        if (!updatedAdmin) {
            throw { code: 500, message: 'Cannot Update Admin CreditRef' };
        }

        return updatedAdmin;
    } catch (err) {
        throw err;
    }
},


    trashAdminUser: async (adminUserId) => {
        try {
            const existingAdminUser = await Admin.findById(adminUserId);

            if (!existingAdminUser) {
                throw { code: 404, message: `Admin User not found with id: ${adminUserId}` };
            }

            // const isPasswordValid = await bcrypt.compare(password, existingAdminUser.password);

            // if (!isPasswordValid) {
            //     throw { code: 401, message: "Invalid password " };
            // }
            
            if (existingAdminUser.balance !== 0) {
                throw { code: 400, message: `Balance Should Be 0 To Move The Admin User To Trash` };
            }
            if (existingAdminUser.isActive === false) {
                throw { code: 404, message: "Admin Is IsActive Or Lock" }
            }

            const updatedTransactionData = {
                id: existingAdminUser._id,
                roles: existingAdminUser.roles,
                userName: existingAdminUser.userName,
                password: existingAdminUser.password,
                balance: existingAdminUser.balance,
                loadBalance: existingAdminUser.loadBalance,
                creditRef: existingAdminUser.creditRef,
                refProfitLoss: existingAdminUser.refProfitLoss,
                createBy: existingAdminUser.createBy
            };

            const backupTransaction = new Trash(updatedTransactionData);
            await backupTransaction.save();

            const deletedAdminUser = await Admin.findByIdAndDelete(adminUserId);

            if (!deletedAdminUser) {
                throw { code: 500, message: `Failed to delete Admin User with id: ${adminUserId}` };
            }

            return true;
        } catch (error) {
            throw error;
        }
    },

    restoreUser: async (adminId) => {
        try {
            const existingAdminUser = await Trash.findById(adminId);

            if (!existingAdminUser) {
                throw { code: 404, message: `Admin not found in trash` };
            }
            const isPasswordValid = await bcrypt.compare(password, existingAdminUser.password);

            if (!isPasswordValid) {
                throw { code: 401, message: "Invalid Password" };
            }
            const restoreRemoveData = {
                roles: existingAdminUser.roles,
                userName: existingAdminUser.userName,
                password: existingAdminUser.password,
                balance: existingAdminUser.balance,
                loadBalance: existingAdminUser.loadBalance,
                creditRef: existingAdminUser.creditRef,
                refProfitLoss: existingAdminUser.refProfitLoss,
                createBy: existingAdminUser.createBy,
            };
            const restoreTransaction = new Admin(restoreRemoveData);
            await restoreTransaction.save();
            await Trash.findByIdAndDelete(adminId);

            return true;
        } catch (err) {
            console.error(err);
            throw { code: 500, message: err.message };
        }
    },

    editPartnership: async (adminId, partnership, password) => {
        try {
            const admin = await Admin.findById(adminId);

            if (!admin) {
                throw { code: 404, message: "Admin not found" };
            }
            const isPasswordValid = await bcrypt.compare(password, admin.password);

            if (!isPasswordValid) {
                throw { code: 401, message: "Invalid password " };
            }
            if (!admin.locked){
                throw { code: 404, message: 'Admin is Suspend or Locked' };
            }
            if( !admin.isActive) {
                throw { code: 404, message: 'Admin is Suspend or Locked' };
            }

            const newPartnershipEntry = {
                value: partnership,
                date: new Date(),
            };

            admin.partnership.push(newPartnershipEntry);


            if (admin.partnership.length > 10) {
                admin.partnership.shift();
            }

            const updatedAdmin = await admin.save();

            if (!updatedAdmin) {
                throw { code: 500, message: 'Cannot Update Admin Partnership' };
            }

            return updatedAdmin;
        } catch (err) {
            throw err;
        }
    },
    
    buildRootPath: async (userName, action, page, searchName,pageSize ) => {
        try {
          let user;
      
          if (userName) {
            user = await Admin.findOne({ userName: userName });
      
            if (!user) {
              throw { code: 404, message: 'User not found' };
            }
          }
      
          let totalPages = 1;
          let currentPage = 1;
      
          if (action === 'store') {
            const newPath = user.userName;
            const indexToRemove = globalUsernames.indexOf(newPath);
      
            if (indexToRemove !== -1) {
              globalUsernames.splice(indexToRemove + 1);
            } else {
              globalUsernames.push(newPath);
            }
      
            const skip = (page - 1) * pageSize;
            const query = {
                createBy: user._id,
                $or: [
                    { userName: { $regex: new RegExp(searchName, "i") } },
                ],
            };
            
          const createdUsers = await Admin.find(query)
              .skip(skip)
              .limit(pageSize);
      
            const totalUsers = await Admin.countDocuments(query);
            totalPages = Math.ceil(totalUsers / pageSize);
            currentPage = page;

            const userDetails = {              
                createdUsers: createdUsers.map(createdUser => ({
                    id: createdUser._id,
                    userName: createdUser.userName,
                    roles: createdUser.roles,
                    balance: createdUser.balance,
                    loadBalance: createdUser.loadBalance,
                    creditRef: createdUser.creditRef,
                    refProfitLoss: createdUser.refProfitLoss,
                    partnership: createdUser.partnership,
                    status: createdUser.isActive ? "Active" : !createdUser.locked ? "Locked" : !createdUser.isActive ? "Suspended" : ""
                })),
            };

           const totalItems = totalUsers
      
            return { message: 'Path stored successfully', path: globalUsernames, userDetails,totalPages ,totalItems};
          } else if (action === 'clear') {
            const lastUsername = globalUsernames.pop();
            if (lastUsername) {
              const indexToRemove = globalUsernames.indexOf(lastUsername);
              if (indexToRemove !== -1) {
                globalUsernames.splice(indexToRemove, 1);
              }
            }
          } else if (action === 'clearAll') {
            globalUsernames.length = 0;
          } else {
            throw { code: 400, message: 'Invalid action provided' };
          }
    
          user.Path = globalUsernames;
          await user.save();
      
          const successMessage =
            action === 'store' ? 'Path stored successfully' : 'Path cleared successfully';
          return { message: successMessage, path: globalUsernames };
        } catch (err) {
          console.error(err);
          throw { code: err.code || 500, message: err.message || 'Internal Server Error' };
        }
      },
      
      
      
     }


