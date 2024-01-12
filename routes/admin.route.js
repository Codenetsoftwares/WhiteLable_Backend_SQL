import { AdminController } from "../controller/admin.controller.js";
import { Admin } from "../models/admin.model.js";
import { Authorize } from "../middleware/auth.js";
import bcrypt from "bcrypt"
import { SubAdmin } from '../models/subAdmin.model.js'
import { Trash } from "../models/trash.model.js";

export const AdminRoute = (app) => {

    //Admin Create

    app.post("/api/admin-create",
        Authorize(["superAdmin", "WhiteLabel", "HyperAgent", "SuperAgent", "MasterAgent", "SubWhiteLabel", "SubAdmin", "SubHyperAgent", "SubSuperAgent", "SubMasterAgent", "Create-Admin"]),
        async (req, res) => {
            try {
                const user = req.user;
                await AdminController.createAdmin(req.body, user);
                res.status(200).send({ code: 200, message: 'Admin registered successfully!' })
            }
            catch (err) {
                res.status(500).send({ code: err.code, message: err.message })
            }
        });

    app.post("/api/admin/create-subAdmin", Authorize(["superAdmin", "WhiteLabel", "HyperAgent", "SuperAgent", "MasterAgent", "SubWhiteLabel", "SubAdmin", "SubHyperAgent", "SubSuperAgent", "SubMasterAgent", "Create-subAdmin"]), async (req, res) => {
        try {
            const user = req.user;
            await AdminController.createSubAdmin(req.body, user);
            res.status(200).send({ code: 200, message: 'Admin registered successfully!' })
        }
        catch (err) {
            res.status(500).send({ code: err.code, message: err.message })
        }
    });

    app.post("/api/view-subAdmin-details", Authorize(["superAdmin", "superAdmin", "WhiteLabel", "HyperAgent", "SuperAgent", "MasterAgent", "SubWhiteLabel", "SubAdmin", "SubHyperAgent", "SubSuperAgent", "SubMasterAgent"]), async (req, res) => {
        try {
            const { createBy } = req.body
            const subAdminData = await Admin.find({ createBy }).exec();
            res.status(200).json(subAdminData)
        } catch (err) {
            res.status(500).json({ code: err.code, message: err.message });
        }
    });

    // admin login

    app.post("/api/admin-login", async (req, res) => {
        try {
            const { userName, password } = req.body;
            const admin = await Admin.findOne({ userName: userName });
            const subAdmin = await SubAdmin.findOne({ userName: userName });

            // Check credentials for Admin
            const adminAccessToken = await AdminController.GenerateAdminAccessToken(userName, password);
            const loginTime = new Date();

            if (admin && adminAccessToken) {
                await Admin.findOneAndUpdate({ userName: userName }, { $set: { lastLoginTime: loginTime } });
                res.status(200).send({ code: 200, message: "Admin Login Successfully", token: adminAccessToken });
            } else if (subAdmin && adminAccessToken) {
                await SubAdmin.findOneAndUpdate({ userName: userName }, { $set: { lastLoginTime: loginTime } });
                res.status(200).send({ code: 200, message: "SubAdmin Login Successfully", token: adminAccessToken });
            } else {
                res.status(404).json({ code: 404, message: 'Invalid Access Token or Admin' });
            }
        } catch (err) {
            console.error('Error:', err.message);
            res.status(err.response?.status || 500).send({ code: err.code, message: err.message });
        }
    });

    //IP

    app.get('/getip/:username', Authorize(["superAdmin", "WhiteLabel", "HyperAgent", "SuperAgent", "MasterAgent", "ActivityLog"]), async (req, res) => {
        try {
            const userName = req.params.username;
            let admin = await Admin.findOne({ userName: userName });

            if (!admin) {
                res.status(404).json({ code: 404, message: 'Admin not found' });
                return;
            }

            const loginTime = admin.lastLoginTime;
            let clientIP = req.ip; //  req.ip to get the client's IP

            // Check if the client is behind a proxy
            const forwardedFor = req.headers['x-forwarded-for'];
            if (forwardedFor) {
                // Extract the first IP address from the list
                const forwardedIps = forwardedFor.split(',');
                clientIP = forwardedIps[0].trim();
            }

            try {
                const data = await fetch(`http://ip-api.com/json/${clientIP}`);
                const collect = await data.json();

                await Admin.findOneAndUpdate({ userName: userName }, { $set: { lastLoginTime: loginTime } });

                const responseObj = {
                    userName: admin.userName,
                    ip: {
                        IP: clientIP,
                        country: collect.country,
                        region: collect.regionName,
                        timezone: collect.timezone,
                    },
                    isActive: admin.isActive,
                    locked: admin.locked,
                    lastLoginTime: loginTime,
                };


                res.json(responseObj);
            } catch (error) {
                console.error('Error fetching data:', error);
                res.status(500).json({ error: 'Internal Server Error' });
            }
        } catch (error) {
            console.error('Error:', error.message);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });



    // reset password

    app.post("/api/admin/reset-password", Authorize(["superAdmin", "WhiteLabel", "HyperAgent", "SuperAgent", "MasterAgent",]), async (req, res) => {
        try {
            const { userName, oldPassword, password } = req.body;
            await AdminController.PasswordResetCode(userName, oldPassword, password);
            res.status(200).send({ code: 200, message: "Password Reset Successful!" });
        } catch (e) {
            console.error(e);
            res.status(e.code).send({ message: e.message });
        }
    }
    );

    // create User

    app.post("/api/admin/Create-user", Authorize(["superAdmin", "WhiteLabel", "HyperAgent", "SuperAgent", "MasterAgent", "Create-User"]), async (req, res) => {
        try {

            const { userName, password } = req.body;
            const user = await AdminController.CreateUser({ userName, password });
            res.status(200).send({ code: 200, message: "User Register Successfully", user })
        }
        catch (err) {
            res.status(500).send({ code: err.code, message: err.message })
        }
    })

    // deposit amt

    app.post("/api/admin/deposit-amount/:adminId", Authorize(["superAdmin"]), async (req, res) => {
        try {
            const adminId = req.params.adminId
            const { depositeAmount } = req.body
            const amount = await AdminController.Deposit(adminId, depositeAmount)
            res.status(200).send({ code: 200, message: "Deposite Amount Successfully" + amount })
        } catch (err) {
            res.status(500).send({ code: err.code, message: err.message })
        }

    })


    // transfer Amount

    app.post("/api/transfer-amount/:userId", Authorize(["superAdmin", "WhiteLabel", "HyperAgent", "SuperAgent", "TransferBalance"]), async (req, res) => {
        try {
            const userId = req.params.userId;
            const { receiveUserId, trnsfAmnt, remarks, withdrawlAmt, password } = req.body;
            console.log(req.body)

            const transferResult = await AdminController.transferAmountadmin(userId, receiveUserId, trnsfAmnt, withdrawlAmt, remarks, password);

            if (!transferResult) {
                res.status(404).send({ code: 404, message: "User Not Found For Transfer" });
            }

            res.status(200).send({ code: 200, message: "Transfer Amount Successfully" });
        } catch (err) {
            const statusCode = err.code || 500;
            res.status(statusCode).send({ code: err.code, message: err.message });
        }
    });



    app.get("/api/transaction-view/:userName", Authorize(["superAdmin", "WhiteLabel", "HyperAgent", "SuperAgent", "MasterAgent", "AccountStatement"]), async (req, res) => {
        try {
            const userName = req.params.userName;
            const page = parseInt(req.query.page) || 1;
            const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
            const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();
            endDate.setDate(endDate.getDate() + 1);
            const pageSize = parseInt(req.query.pageSize) || 5;

            let balances = 0;
            let debitBalances = 0;
            let withdrawalBalances = 0;

            const admin = await Admin.findOne({ userName }).exec();

            if (!admin) {
                return res.status(404).json({ message: "Admin not found" });
            }

            let transactionData = admin.transferAmount;

            transactionData = transactionData.filter(data => {
                const transactionDate = new Date(data.date);
                return (!startDate || transactionDate >= startDate) && (transactionDate < endDate);
            });

            transactionData.sort((a, b) => new Date(b.date) - new Date(a.date));

            const totalItems = transactionData.length;
            const totalPages = Math.ceil(totalItems / pageSize);

            const skip = (page - 1) * pageSize;
            const endIndex = page * pageSize;

            const paginatedData = transactionData.slice(skip, endIndex);

            let allData = JSON.parse(JSON.stringify(paginatedData));

            allData.map((data) => {
                if (data.transactionType === "Credit") {
                    balances += data.amount;
                    data.balance = balances;
                } else if (data.transactionType === "Debit") {
                    debitBalances += data.amount;
                    data.debitBalance = debitBalances;
                } else if (data.transactionType === "Withdrawal") {
                    withdrawalBalances += data.withdraw;
                    data.withdrawalBalance = withdrawalBalances;
                }
            });

            res.status(200).json({ allData, totalPages, totalItems });

        } catch (err) {
            res.status(500).json({ code: err.code, message: err.message });
        }
    });





    // view creates
    app.get("/api/view-all-creates/:createdBy",
        Authorize(["superAdmin", "WhiteLabel", "HyperAgent", "SuperAgent", "MasterAgent", "TransferBalance",
            "Status", "CreditRef-Edit", "Partnership-Edit", "CreditRef-View", "Partnership-View", "User-Profile-View",
            "Profile-View", "View-Admin-Data", "Create-Admin", "Create-User", "AccountStatement", "ActivityLog",
            "Delete-Admin", "Restore-Admin", "Move-To-Trash", "Trash-View",]),
        async (req, res) => {
            try {
                const createdBy = req.params.createdBy;
                const page = parseInt(req.query.page) || 1;
                const searchName = req.query.searchName || "";
                const pageSize = parseInt(req.query.pageSize) || 5;

                const skip = (page - 1) * pageSize;

                let query = { createBy: createdBy };

                if (searchName) {
                    query.$or = [
                        { userName: { $regex: new RegExp(searchName, "i") } },
                        //   { roles: { $elemMatch: { role: { $regex: new RegExp(searchName, "i") } } } }
                    ];
                }

                const adminCount = await Admin.countDocuments(query);
                const admin = await Admin.find(query)
                    .skip(skip)
                    .limit(pageSize);

                if (!admin || admin.length === 0) {
                    return res.status(404).send({ code: 404, message: `No records found` });
                }

                const user = admin.map((users) => {
                    return {
                        id: users.id,
                        userName: users.userName,
                        roles: users.roles,
                        balance: users.balance,
                        loadBalance: users.loadBalance,
                        creditRef: users.creditRef,
                        refProfitLoss: users.refProfitLoss,
                        createBy: users.createBy,
                        partnership: users.partnership,
                        Status: users.isActive ? "Active" : !users.locked ? "Locked" : !users.isActive ? "Suspended" : ""
                    };

                });

                const totalPages = Math.ceil(adminCount / pageSize);

                res.status(200).send({
                    user,
                    totalPages,
                    totalItems: adminCount
                });

            } catch (err) {
                res.status(500).send({ code: err.code, message: err.message });
            }
        });

        app.get("/api/view-all-subAdmin-creates/:createdBy",
        Authorize(["SubAdmin", "SubWhiteLabel", "SubHyperAgent", "SubSuperAgent", "SubMasterAgent", "TransferBalance",
            "Status", "CreditRef-Edit", "Partnership-Edit", "CreditRef-View", "Partnership-View", "User-Profile-View",
            "Profile-View", "View-Admin-Data", "Create-Admin", "Create-User", "AccountStatement", "ActivityLog",
            "Delete-Admin", "Restore-Admin", "Move-To-Trash", "Trash-View",]),
        async (req, res) => {
            try {
                const createdBy = req.params.createdBy;
                const page = parseInt(req.query.page) || 1;
                const searchName = req.query.searchName || "";
                const pageSize = parseInt(req.query.pageSize) || 5;

                const skip = (page - 1) * pageSize;

                let query = { createBy: createdBy };

                if (searchName) {
                    query.$or = [
                        { userName: { $regex: new RegExp(searchName, "i") } },
                        //   { roles: { $elemMatch: { role: { $regex: new RegExp(searchName, "i") } } } }
                    ];
                }

                const adminCount = await SubAdmin.countDocuments(query);
                const admin = await SubAdmin.find(query)
                    .skip(skip)
                    .limit(pageSize);
                    console.log("sub", admin)

                if (!admin || admin.length === 0) {
                    return res.status(404).send({ code: 404, message: `No records found` });
                }

                const user = admin.map((users) => {
                    return {
                        id: users.id,
                        userName: users.userName,
                        roles: users.roles,
                        balance: users.balance,
                        loadBalance: users.loadBalance,
                        creditRef: users.creditRef,
                        refProfitLoss: users.refProfitLoss,
                        createBy: users.createBy,
                        partnership: users.partnership,
                        Status: users.isActive ? "Active" : !users.locked ? "Locked" : !users.isActive ? "Suspended" : ""
                    };

                });

                const totalPages = Math.ceil(adminCount / pageSize);

                res.status(200).send({
                    user,
                    totalPages,
                    totalItems: adminCount
                });

            } catch (err) {
                res.status(500).send({ code: err.code, message: err.message });
            }
        });

    // view balance

    app.get("/api/view-balance/:id", Authorize(["superAdmin", "WhiteLabel", "HyperAgent", "SuperAgent", "MasterAgent", "SubAdmin"]), async (req, res) => {
        try {
            const id = req.params.id;
            const admin = await Admin.findById(id);
            if (!admin) {
                const subAdmin = await SubAdmin.findById(id);
                if (!subAdmin) {
                    return res.status(404).send({ code: 404, message: `Not Found` });
                }
                const amount = {
                    balance: subAdmin.balance
                };
                return res.status(200).send({ amount });
            }
            const amount = {
                balance: admin.balance
            };
            res.status(200).send({ amount });
        } catch (err) {
            res.status(500).send({ code: err.code, message: err.message });
        }
    });
    
    

    // active status

    app.post("/api/activate/:adminId", Authorize(["superAdmin", "WhiteLabel", "HyperAgent", "SuperAgent", "MasterAgent", "Status"]),
        async (req, res) => {
            try {
                const { adminId } = req.params;
                const { isActive, locked, password } = req.body;
                const admin = await Admin.findById(adminId);

                const isPasswordValid = await bcrypt.compare(password, admin.password);
                if (!isPasswordValid) {
                    throw { code: 401, message: "Invalid password" };
                }
                // console.log("Password......", isPasswordValid)
                const adminActive = await AdminController.activateAdmin(adminId, isActive, locked, password);
                res.status(200).send(adminActive);
            } catch (err) {
                res.status(500).send({ code: err.code, message: err.message });
            }
        });


    //  creditref 

    app.put("/api/admin/update-credit-ref/:adminId", Authorize(["superAdmin", "WhiteLabel", "HyperAgent", "SuperAgent", "MasterAgent", "CreditRef-Edit"]),
        async (req, res) => {
            try {
                const adminId = req.params.adminId;
                const { creditRef, password } = req.body;

                const updatedAdmin = await AdminController.editCreditRef(adminId, creditRef, password);

                if (updatedAdmin) {
                    res.status(200).send({ message: "CreditRef Edit successfully" });
                } else {
                    res.status(404).send({ message: "Data not found" });
                }
            } catch (error) {
                console.error(error.message);
                res.status(500).json({ error: error.message });
            }
        });

    //  Move To Trash 

    app.post("/api/admin/move-to-trash-user", Authorize(["superAdmin", "WhiteLabel", "HyperAgent", "SuperAgent", "MasterAgent", "Move-To-Trash"]),
        async (req, res) => {
            try {
                const { requestId, } = req.body;
                const adminUser = await Admin.findById(requestId);
                if (!adminUser) {
                    return res.status(404).send("Admin User not found");
                }
                const updateResult = await AdminController.trashAdminUser(adminUser,);

                if (updateResult) {
                    res.status(201).send("Admin User Moved To Trash");
                }
            } catch (e) {
                console.error(e);
                res.status(e.code).send({ message: e.message });
            }
        });

    //   View Trash Data

    app.get("/api/admin/view-trash", Authorize(["superAdmin", "WhiteLabel", "HyperAgent", "SuperAgent", "MasterAgent", "Trash-View"]),
        async (req, res) => {
            try {
                const resultArray = await Trash.find().exec();
                res.status(200).send(resultArray);
            } catch (error) {
                res.status(500).send("Internal Server error");
            }
        }
    );

    //   Delete From Trash

    app.delete("/api/delete/admin-user/:id", Authorize(["superAdmin", "WhiteLabel", "HyperAgent", "SuperAgent", "MasterAgent", "Delete-Admin"]),
        async (req, res) => {
            try {
                const id = req.params.id;
                const result = await Trash.deleteOne({ _id: id });
                if (result.deletedCount === 1) {
                    res.status(200).send({ message: "Data Deleted Successfully" });
                } else {
                    res.status(404).send({ message: "Data not found" });
                }
            } catch (e) {
                console.error(e);
                res.status(500).send({ message: e.message });
            }
        });

    //   View Active Locked Status

    app.get("/api/admin/active-status/:adminId", Authorize(["superAdmin", "WhiteLabel", "HyperAgent", "SuperAgent", "MasterAgent", "Status"]),
        async (req, res) => {
            try {
                const adminId = req.params.adminId
                const activateStatus = await Admin.findById(adminId).exec();
                if (!activateStatus) {
                    return res.status(404).send({ code: 404, message: `Admin Not Found` });
                }

                const active = {
                    id: activateStatus.id,
                    isActive: activateStatus.isActive,
                    locked: activateStatus.locked,
                    Status: activateStatus.isActive ? "Active" : !activateStatus.locked ? "Locked" : !activateStatus.isActive ? "Suspended" : ""
                };

                res.status(200).send(active);
            } catch (err) {

                res.status(500).send({ code: err.code, message: err.message });
            }
        });

    //   Restore Transh Data

    app.post("/api/admin/restore-to-wallet-user", Authorize(["superAdmin", "WhiteLabel", "HyperAgent", "SuperAgent", "MasterAgent", "Restore-Admin"]),
        async (req, res) => {
            try {
                const { userId, password } = req.body;
                const restoreResult = await AdminController.restoreUser(userId, password);
                if (restoreResult) {
                    res.status(201).send("Admin User Moved To Wallet");
                } else {
                    res.status(500).send("Failed to restore Admin User to Wallet");
                }
            } catch (err) {
                res.status(500).send({ message: err.message });
            }
        });

    //   View User Profile

    app.get("/api/User-Profile-view/:userName", Authorize(["superAdmin", "WhiteLabel", "HyperAgent", "SuperAgent", "MasterAgent", "User-Profile-View"]),
        async (req, res) => {
            try {
                const userName = req.params.userName;
                const admin = await Admin.findOne({ userName: userName }).exec();


                const transferData = {
                    userId: admin.id,
                    Roles: admin.roles,
                    userName: admin.userName,

                };
                res.status(200).json(transferData);
            } catch (err) {
                res.status(500).json({ code: err.code, message: err.message });
            }
        });

    //Partnership

    app.put("/api/admin/update-partnership/:adminId", Authorize(["superAdmin", "WhiteLabel", "HyperAgent", "SuperAgent", "MasterAgent", "Partnership-Edit"]),
        async (req, res) => {
            try {
                const adminId = req.params.adminId;
                const { partnership, password } = req.body;

                const updatedAdmin = await AdminController.editPartnership(adminId, partnership, password);
                if (updatedAdmin) {
                    res.status(200).send({ message: "Partnership Edit Successfully" });
                } else {
                    res.status(404).send({ message: "Data Not Found" });
                }
            } catch (error) {
                console.error(error.message);
                res.status(500).json({ error: error.message });
            }
        });


    app.get("/api/partnershipView/:id", Authorize(["superAdmin", "WhiteLabel", "HyperAgent", "SuperAgent", "MasterAgent", "Partnership-View"]),
        async (req, res) => {
            try {
                const id = req.params.id;
                const admin = await Admin.findById(id);

                if (!admin) {
                    res.status(404).json({ code: 404, message: "Admin Not Found" });
                    return;
                }

                const last10Partnerships = admin.partnership.slice(-10);

                const transferData = {
                    partnership: last10Partnerships,
                    userName: admin.userName,
                };

                res.status(200).json(transferData);
            } catch (err) {
                res.status(500).json({ code: err.code, message: err.message });
            }
        });


    app.get("/api/creditRefView/:id", Authorize(["superAdmin", "WhiteLabel", "HyperAgent", "SuperAgent", "MasterAgent", "CreditRef-View"]),
        async (req, res) => {
            try {
                const id = req.params.id;
                const admin = await Admin.findById(id);

                if (!admin) {
                    res.status(404).json({ code: 404, message: "Admin Not Found" });
                    return;
                }

                const last10creditRef = admin.creditRef.slice(-10);

                const transferData = {
                    creditRef: last10creditRef,
                    userName: admin.userName,
                };

                res.status(200).json(transferData);
            } catch (err) {
                res.status(500).json({ code: err.code, message: err.message });
            }
        });

    app.post('/api/Root-Path/:userName/:action',
        async (req, res) => {
            const { userName, action } = req.params;
            const searchName = req.body.searchName;
            const page = req.body.page;
            const pageSize = parseInt(req.query.pageSize) || 5;

            try {
                const result = await AdminController.buildRootPath(userName, action, parseInt(page), searchName, pageSize);
                res.status(200).json(result);
            } catch (error) {
                res.status(error.code || 500).json({ error: error.message || 'Internal Server Error' });
            }
        });


    // Renew Permission

    app.get("/api/admin/view-sub-admins/:id", Authorize(["superAdmin"]), async (req, res) => {
        const id = req.params.id;
        const ITEMS_PER_PAGE = 5;
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 5;
        const searchName = req.query.searchName || "";
        try {
            const query = { createBy: id };
    
            if (searchName) {
                query.$or = [
                    { userName: { $regex: new RegExp(searchName, "i") } },
                ];
            }
            const totalCount = await SubAdmin.countDocuments(query);
            const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
    
            const subAdmin = await SubAdmin.find(query)
                .skip((page - 1) * ITEMS_PER_PAGE)
                .limit(pageSize);
    
            if (subAdmin.length === 0) {
                return res.status(404).json({ message: "No data found" });
            }
    
            res.status(200).json({
                data: subAdmin,
                currentPage: page,
                totalPages: totalPages,
                totalCount: totalCount
            });
        } catch (e) {
            console.error(e);
            res.status(500).send({ message: "Internal Server Error" });
        }
    });
    
    
    

    app.post(
        "/api/admin/single-sub-admin/:id",
        Authorize(["superAdmin"]),
        async (req, res) => {
            try {
                if (!req.params.id) {
                    throw { code: 400, message: "Sub Admin's Id not present" };
                }
                const subAdminId = req.params.id;
                const subAdmin = await SubAdmin.findById(subAdminId).exec();
                if (!subAdmin) {
                    throw { code: 500, message: "Sub Admin not found with the given Id" };
                }
                const data = {
                    userName: subAdmin.userName,
                    roles: subAdmin.roles
                }
                res.status(200).send(data);
            } catch (e) {
                console.error(e);
                res.status(e.code).send({ message: e.message });
            }
        }
    );

    app.put(
        "/admin/edit-subadmin-permissions/:id",
        Authorize(["superAdmin"]),
        async (req, res) => {
            try {
                const subAdminId = req.params.id;
                const { permission } = req.body;
                console.log('permis',req.body)
                if (!subAdminId) {
                    throw { code: 400, message: "Id not found" };
                }
                const subAdmin = await SubAdmin.findById(subAdminId);
                if (!subAdmin) {
                    throw { code: 400, message: "Sub Admin not found" };
                }
                    subAdmin.roles[0].permission = permission

                await subAdmin.save();
                res.status(200).send(`${subAdmin.userName} permissions edited successfully`);
            } catch (e) {
                console.error(e);
                res.status(e.code || 500).send({ message: e.message || "Internal Server Error" });
            }
        }
    );

    app.get("/api/admin/account-statement/:id", Authorize(["superAdmin"]), async (req, res) => {
        const id = req.params.id;
        const ITEMS_PER_PAGE = 5;
        const page = parseInt(req.query.page) || 1;
        try {
            const data = await Admin.findById(id).exec();
            if (!data) {
                return res.status(404).send({ message: 'Admin not found' });
            }
            const mergedData = data.transferAmount.concat(data.selfTransaction);
            const totalCount = mergedData.length;
            const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
    
            const paginatedData = mergedData.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
    
            res.status(200).json({
                data: paginatedData,
                currentPage: page,
                totalPages: totalPages,
                totalCount: totalCount
            });
        } catch (e) {
            console.error(e);
            res.status(500).send({ message: 'Internal Server Error' });
        }
    });
    
    
      
    

}