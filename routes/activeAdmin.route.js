import { activateAdmin } from "../controller/activeAdmin.js";
import admins from "../models/admin.model.js";

export const activeAdminRoute = (app) => {
    app.post("/api/activate/:adminId", 
        // Authorize(["superAdmin", "WhiteLabel", "HyperAgent", "SuperAgent", "MasterAgent", "Status"]),
        async (req, res) => {
            try {
                const { adminId } = req.params;
                const { isActive, locked } = req.body;
                const admin = await admins.findOne({where : {adminId}});

                // const isPasswordValid = await bcrypt.compare(password, admin.password);
                // if (!isPasswordValid) {
                //     throw { code: 401, message: "Invalid password" };
                // }
                // console.log("Password......", isPasswordValid)
                const adminActive = await activateAdmin(adminId, isActive, locked);
                res.status(200).send(adminActive);
            } catch (err) {
                res.status(500).send({ code: err.code, message: err.message });
            }
        });
};
